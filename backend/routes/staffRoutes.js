const router = require("express").Router();
const Staff = require("../models/Staff");
const { authenticate, adminOnly } = require("../middleware/auth");
const wrap = require("../utils/asyncHandler");
const { safeText, normalizePhone } = require("../utils/validation");
router.use(authenticate);
router.get("/", wrap(async (_req, res) => res.json({ staff: await Staff.find().sort({ name: 1 }) })));
router.post("/", adminOnly, wrap(async (req, res) => {
  const name = safeText(req.body.name, 80), phone = normalizePhone(req.body.phone);
  if (!name || !/^[1-9]\d{7,14}$/.test(phone)) return res.status(400).json({ message: "Enter a staff name and international phone number (8–15 digits)." });
  res.status(201).json({ staff: await Staff.create({ name, phone }) });
}));
router.delete("/:id", adminOnly, wrap(async (req, res) => {
  if (!require("mongoose").isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid Staff ID." });
  const staff = await Staff.findByIdAndDelete(req.params.id);
  if (!staff) return res.status(404).json({ message: "Staff not found." });
  res.json({ message: "Staff deleted. Existing customer records and documents are preserved." });
}));
module.exports = router;
