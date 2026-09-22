const Customer = require("../models/Customer");
const Staff = require("../models/Staff");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const { sendCustomerImage } = require("../services/whatsapp");
const { safeText, escapeRegex } = require("../utils/validation");
const actor = req => ({ user: req.user._id, name: req.user.name });
exports.list = async (req, res) => {
  const query = {}, term = safeText(req.query.q, 100);
  if (term) { const re = new RegExp(escapeRegex(term), "i"); query.$or = [{ name: re }, { city: re }]; }
  if (req.query.from || req.query.to) {
    query.lastActivityAt = {};
    for (const [key, op] of [["from", "$gte"], ["to", "$lte"]]) {
      if (!req.query[key]) continue;
      const value = new Date(req.query[key]);
      if (Number.isNaN(value.getTime())) return res.status(400).json({ message: "Invalid date/time filter." });
      if (key === "to" && /^\d{4}-\d{2}-\d{2}$/.test(req.query[key])) value.setUTCHours(23,59,59,999);
      query.lastActivityAt[op] = value;
    }
    if (query.lastActivityAt.$gte > query.lastActivityAt.$lte) return res.status(400).json({ message: "From must be before To." });
  }
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
  const [customers, total] = await Promise.all([
    Customer.find(query).select("name city createdAt updatedAt lastActivityAt").sort({ lastActivityAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
    Customer.countDocuments(query),
  ]);
  res.json({ customers, total, page, pages: Math.ceil(total / limit) });
};
// History is an activity feed: one creation row plus one row per saved document.
// Deriving it from saved records also includes existing uploads without a migration.
exports.history = async (req, res) => {
  const range = {};
  for (const [key, op] of [["from", "$gte"], ["to", "$lte"]]) {
    if (!req.query[key]) continue;
    const date = new Date(req.query[key]);
    if (Number.isNaN(date.getTime())) return res.status(400).json({ message: "Invalid date/time filter." });
    if (key === "to" && /^\d{4}-\d{2}-\d{2}$/.test(req.query[key])) date.setUTCHours(23,59,59,999);
    range[op] = date;
  }
  if (range.$gte > range.$lte) return res.status(400).json({ message: "From must be before To." });
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
  const pipeline = [
    { $project: { name: 1, city: 1, events: { $concatArrays: [
      [{ eventId: "$_id", at: "$createdAt", kind: "customer_created" }],
      { $map: { input: { $ifNull: ["$documents", []] }, as: "doc", in: {
        eventId: "$$doc._id", at: { $ifNull: ["$$doc.uploadedAt", "$createdAt"] }, kind: "document_uploaded"
      } } }
    ] } } },
    { $unwind: "$events" },
    ...(Object.keys(range).length ? [{ $match: { "events.at": range } }] : []),
    { $sort: { "events.at": -1, "events.kind": -1, "events.eventId": -1, _id: -1 } },
    { $facet: {
      customers: [{ $skip: (page - 1) * limit }, { $limit: limit }, { $project: {
        _id: 1, name: 1, city: 1, eventId: "$events.eventId", activityAt: "$events.at", activityType: "$events.kind"
      } }],
      count: [{ $count: "total" }]
    } }
  ];
  const [result] = await Customer.aggregate(pipeline);
  const total = result?.count[0]?.total || 0;
  res.json({ customers: result?.customers || [], total, page, pages: Math.ceil(total / limit) });
};
exports.get = async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: "Customer not found." });
  res.json({ customer });
};
exports.create = async (req, res) => {
  const name = safeText(req.body.name), city = safeText(req.body.city, 100);
  if (!name || !city) return res.status(400).json({ message: "Customer name and city are required." });
  if (!require("mongoose").isValidObjectId(req.body.staffId)) return res.status(400).json({ message: "Select registered Staff." });
  const staff = await Staff.findById(req.body.staffId);
  if (!staff) return res.status(400).json({ message: "Select registered Staff." });
  res.status(201).json({ customer: await Customer.create({ name, city, staff: staff._id, staffName: staff.name, lastActivityAt: new Date(), savedBy: actor(req) }) });
};
exports.upload = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Select an image or PDF." });
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: "Customer not found." });
  const old = req.params.docId ? customer.documents.id(req.params.docId) : null;
  if (req.params.docId && !old) return res.status(404).json({ message: "Document not found." });
  const staff = customer.staff ? await Staff.findById(customer.staff) : null;
  if (!staff || !/^[1-9]\d{7,14}$/.test(staff.phone || "")) return res.status(400).json({ message: "This customer needs a valid registered Staff assignment before sending." });
  const resourceType = req.file.mimetype === "application/pdf" ? "raw" : "image";
  const asset = await cloudinary.uploader.upload(
    "data:" + req.file.mimetype + ";base64," + req.file.buffer.toString("base64"),
    { folder: "customer-management-system", resource_type: resourceType }
  );
  const previous = old?.publicId ? { id: old.publicId, type: old.resourceType } : null;
  const fields = { url: asset.secure_url, publicId: asset.public_id, resourceType, uploadedAt: new Date(), savedBy: actor(req), staff: staff._id, staffName: staff.name, lastSend: undefined };
  if (old) Object.assign(old, fields);
  else customer.documents.push({ ...fields, staff: staff._id, staffName: staff.name });
  customer.lastActivityAt = new Date();
  try { await customer.save(); } catch (error) {
    await cloudinary.uploader.destroy(asset.public_id, { resource_type: resourceType }).catch(() => {});
    throw error;
  }
  if (previous) await cloudinary.uploader.destroy(previous.id, { resource_type: previous.type || "image" }).catch(() => console.error("Previous image cleanup failed."));
  const doc = old || customer.documents[customer.documents.length - 1];
  const notification = await deliver(customer, doc, staff, req.user);
  res.json({ customer, notification });
};
exports.send = async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  const doc = customer?.documents.id(req.params.docId);
  if (!doc) return res.status(404).json({ message: "Document not found." });
  const staff = customer.staff ? await Staff.findById(customer.staff) : null;
  if (!staff || !/^[1-9]\d{7,14}$/.test(staff.phone || "")) return res.status(400).json({ message: "Customer has no valid assigned Staff WhatsApp number." });
  const notification = await deliver(customer, doc, staff, req.user);
  res.json({ customer, notification });
};
async function deliver(customer, doc, staff, user) {
  const result = await sendCustomerImage({ imageUrl: doc.url, phone: staff.phone, customerName: customer.name, resourceType: doc.resourceType });
  doc.lastSend = { status: result.status, recipient: staff.phone, sentBy: user._id, at: new Date(), messageId: result.messageId || "" };
  try { await customer.save(); } catch {
    return { ...result, warning: "Document saved; delivery status could not be recorded. Check WhatsApp before retrying." };
  }
  return result;
}
exports.stats = async (_req, res) => {
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
  const [totalCustomers, activeUsers, thisMonth, docs] = await Promise.all([
    Customer.countDocuments(), User.countDocuments({ active: true, role: { $in: ["user", "staff"] } }),
    Customer.countDocuments({ createdAt: { $gte: start } }),
    Customer.aggregate([{ $project: { count: { $size: { $ifNull: ["$documents", []] } } } }, { $group: { _id: null, total: { $sum: "$count" } } }]),
  ]);
  res.json({ totalCustomers, activeUsers, thisMonth, imagesSaved: docs[0]?.total || 0 });
};
