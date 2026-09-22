const Setting = require("../models/Setting");
const { getRetentionSetting, runCleanup } = require("../services/cleanup");
const getSettings = async (_req, res) => res.json({ setting: await getRetentionSetting() });
const updateSettings = async (req, res) => {
  const retentionMonths = Number(req.body.retentionMonths);
  if (![1, 2].includes(retentionMonths)) return res.status(400).json({ message: "Retention must be 1 or 2 months." });
  const setting = await Setting.findOneAndUpdate({ key: "data-retention" }, { retentionMonths },
    { returnDocument: "after", upsert: true, runValidators: true });
  res.json({ setting });
};
const cleanupNow = async (_req, res) => res.json(await runCleanup());
module.exports = { getSettings, updateSettings, cleanupNow };
