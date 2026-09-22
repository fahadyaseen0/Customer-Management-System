const Customer = require("../models/Customer");
const Setting = require("../models/Setting");
const cloudinary = require("../config/cloudinary");
const { cutoffFor } = require("../utils/retention");
const getRetentionSetting = () => Setting.findOneAndUpdate(
  { key: "data-retention" }, { $setOnInsert: { retentionMonths: 2 } }, { returnDocument: "after", upsert: true }
);
let running = false;
const runCleanup = async () => {
  if (running) return { deletedCount: 0, skipped: true };
  running = true;
  let deletedCount = 0, failedCount = 0;
  try {
    const setting = await getRetentionSetting(), cutoff = cutoffFor(new Date(), setting.retentionMonths);
    for await (const record of Customer.find({ createdAt: { $lt: cutoff } }).cursor()) {
      try {
        const assets = [...record.documents];
        if (record.image?.publicId) assets.push(record.image);
        for (const asset of assets) {
          if (!asset.publicId) continue;
          const result = await cloudinary.uploader.destroy(asset.publicId, { resource_type: asset.resourceType || "image" });
          if (!["ok", "not found"].includes(result.result)) throw new Error("Asset deletion failed");
        }
        await Customer.deleteOne({ _id: record._id });
        deletedCount++;
      } catch { failedCount++; } // Keep record/asset references for the next scheduled retry.
    }
    return { deletedCount, failedCount, cutoff };
  } finally { running = false; }
};
module.exports = { getRetentionSetting, runCleanup };
