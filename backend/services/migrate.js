const User = require("../models/User");
const Customer = require("../models/Customer");
module.exports = async () => {
  // Legacy login accounts stay login accounts, never become directory Staff.
  await User.updateMany({ role: "staff" }, { $set: { role: "user" } });
  for await (const c of Customer.find({ "image.url": { $exists: true, $ne: "" }, "documents.0": { $exists: false } }).cursor()) {
    c.documents.push({
      staffName: "Legacy upload — staff not recorded",
      url: c.image.url, publicId: c.image.publicId, resourceType: c.image.resourceType || "image",
      uploadedAt: c.image.uploadedAt || c.createdAt, savedBy: c.savedBy,
    });
    // The same asset now belongs to documents; no external image is deleted.
    c.image = undefined;
    await c.save();
  }
  // Infer only unambiguous existing assignments. Never guess among different Staff.
  for await (const c of Customer.find({ $or: [{ lastActivityAt: { $exists: false } }, { staff: null }] }).cursor()) {
    const ids = [...new Set(c.documents.map(d => d.staff && String(d.staff)).filter(Boolean))];
    const patch = {};
    if (!c.staff && ids.length === 1) {
      const staff = await require("../models/Staff").findById(ids[0]);
      if (staff) { patch.staff = staff._id; patch.staffName = staff.name; }
    }
    patch.lastActivityAt = new Date(Math.max(new Date(c.createdAt).getTime(), ...c.documents.map(d => new Date(d.uploadedAt || c.createdAt).getTime())));
    await Customer.updateOne({ _id: c._id }, { $set: patch }, { timestamps: false });
  }
};
