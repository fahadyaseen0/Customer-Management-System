const mongoose = require("mongoose");
const settingSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  retentionMonths: { type: Number, enum: [1, 2], default: 2 },
}, { timestamps: true });
module.exports = mongoose.model("Setting", settingSchema);
