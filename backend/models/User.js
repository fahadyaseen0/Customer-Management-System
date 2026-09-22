const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  whatsapp: { type: String, trim: true, default: "" },
  role: { type: String, enum: ["admin", "user", "staff"], default: "user" },
  active: { type: Boolean, default: true },
  tokenVersion: { type: Number, default: 0 },
  lastLoginAt: Date,
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
