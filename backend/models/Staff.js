const mongoose = require("mongoose");
module.exports = mongoose.model("Staff", new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  phone: { type: String, required: true },
}, { timestamps: true }));
