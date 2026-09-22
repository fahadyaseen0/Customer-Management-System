const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  city: { type: String, required: true, trim: true, maxlength: 100 },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", default: null },
  staffName: { type: String, default: "" },
  lastActivityAt: { type: Date, default: Date.now },
  seller: {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, trim: true },
    whatsapp: { type: String, trim: true, default: "" },
  },
  image: {
    url: { type: String, default: "" }, publicId: { type: String, default: "" }, uploadedAt: Date,
    resourceType: { type: String, enum: ["image", "raw"], default: "image" },
    whatsappStatus: { type: String, enum: ["not_sent", "sent", "failed", "not_configured"], default: "not_sent" },
    whatsappMessageId: { type: String, default: "" }, whatsappError: { type: String, default: "" },
  },
  documents: [{
    staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    staffName: String,
    url: String,
    publicId: String,
    resourceType: { type: String, default: "image" },
    uploadedAt: Date,
    savedBy: { user: mongoose.Schema.Types.ObjectId, name: String },
    lastSend: { status: String, recipient: String, sentBy: mongoose.Schema.Types.ObjectId, at: Date, messageId: String },
  }],
  savedBy: {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
  },
}, { timestamps: true });

customerSchema.index({ name: "text", city: "text" });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ lastActivityAt: -1, _id: -1 });
module.exports = mongoose.model("Customer", customerSchema);
