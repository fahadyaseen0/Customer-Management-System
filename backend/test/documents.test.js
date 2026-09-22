const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Staff = require("../models/Staff");
const cloudinary = require("../config/cloudinary");
const c = require("../controllers/customerController");
test("upload saves and sends to assigned Staff; replacement preserves assignment", async () => {
  const original = { find: Customer.findById, staff: Staff.findById, upload: cloudinary.uploader.upload, destroy: cloudinary.uploader.destroy, fetch: global.fetch };
  const id = new mongoose.Types.ObjectId();
  const record = new Customer({ name: "Customer", city: "Lahore", staff: id, staffName: "Field Staff", savedBy: { user: id, name: "User A" } });
  record.save = async () => record;
  Customer.findById = async () => record;
  Staff.findById = async () => ({ _id: id, name: "Field Staff", phone: "923001234567" });
  let uploaded = 0, sends = 0; const deleted = [];
  cloudinary.uploader.upload = async () => ({ public_id: "asset" + (++uploaded), secure_url: "https://example.com/" + uploaded });
  cloudinary.uploader.destroy = async id => { deleted.push(id); return { result: "ok" }; };
  process.env.BOTLINKD_APP_KEY = "test"; process.env.BOTLINKD_AUTH_KEY = "admin";
  process.env.BOTLINKD_IMAGE_TEMPLATE="image_template";
  global.fetch = async (_url, options) => { sends++; assert.equal(options.body.get("to"), "923001234567"); return {ok: true, json: async () => ({messages:[{id:"accepted"}]})}; };
  const req = { params: { id: String(record._id) }, body: { staffId: String(id) }, file: { mimetype: "image/png", buffer: Buffer.from("test") }, user: { _id: id, name: "User A" } };
  const res = { json: () => {} };
  try {
    await c.upload(req, res); await c.upload(req, res);
    assert.equal(record.documents.length, 2); assert.equal(sends, 2);
    record.documents[0].lastSend = { status: "sent", recipient: "123" };
    req.params.docId = String(record.documents[0]._id); req.user.name = "User B";
    await c.upload(req, res);
    assert.equal(record.documents.length, 2);
    assert.equal(record.documents[0].staffName, "Field Staff");
    assert.equal(record.documents[0].savedBy.name, "User B");
    assert.equal(record.documents[0].lastSend?.status, "sent");
    assert.deepEqual(deleted, ["asset1"]);
    assert.equal(record.documents[1].publicId, "asset2");
    assert.equal(sends, 3);
  } finally { Customer.findById = original.find; Staff.findById = original.staff; cloudinary.uploader.upload = original.upload; cloudinary.uploader.destroy = original.destroy; global.fetch = original.fetch; }
});
test("cleanup removes every attached asset, keeps failed records for retry", async () => {
  const Setting = require("../models/Setting");
  const { runCleanup } = require("../services/cleanup");
  const original = { find: Customer.find, setting: Setting.findOneAndUpdate, destroy: cloudinary.uploader.destroy, remove: Customer.deleteOne };
  const removed = [], assets = [];
  Setting.findOneAndUpdate = async () => ({ retentionMonths: 1 });
  Customer.find = () => ({ cursor: async function* () {
    yield { _id: "good", documents: [{ publicId: "image1", resourceType: "image" }, { publicId: "pdf1", resourceType: "raw" }] };
    yield { _id: "failed", documents: [{ publicId: "bad" }] };
  } });
  cloudinary.uploader.destroy = async (id, opts) => { assets.push([id, opts.resource_type]); if (id === "bad") throw new Error("Provider unavailable"); return { result: "ok" }; };
  Customer.deleteOne = async filter => { removed.push(filter._id); };
  try {
    const result = await runCleanup();
    assert.equal(result.deletedCount, 1); assert.equal(result.failedCount, 1);
    assert.deepEqual(removed, ["good"]); assert.deepEqual(assets, [["image1","image"],["pdf1","raw"],["bad","image"]]);
  } finally { Customer.find = original.find; Setting.findOneAndUpdate = original.setting; cloudinary.uploader.destroy = original.destroy; Customer.deleteOne = original.remove; }
});
