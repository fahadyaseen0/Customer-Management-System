const bcrypt = require("bcrypt");
const User = require("../models/User");
const { publicUser } = require("./authController");
const { forceLogout } = require("../services/sessionEvents");
const { normalizeEmail, normalizePhone, isEmail, safeText } = require("../utils/validation");

const listUsers = async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users: users.map(publicUser) });
};
const listSellers = async (_req, res) => {
  const users = await User.find({ active: true }).sort({ name: 1 });
  res.json({ users: users.map(publicUser) });
};
const createUser = async (req, res) => {
  const name = safeText(req.body.name, 80);
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const whatsapp = normalizePhone(req.body.whatsapp);
  const role = req.body.role === "admin" ? "admin" : "user";
  if (!name || !isEmail(email)) return res.status(400).json({ message: "A valid name and email are required." });
  if (!email.endsWith("@gmail.com")) return res.status(400).json({ message: "Please use a Gmail address." });
  if (password.length < 8) return res.status(400).json({ message: "Password must contain at least 8 characters." });
  if (!/^[1-9]\d{7,14}$/.test(whatsapp)) return res.status(400).json({ message: "Enter an international WhatsApp number (8–15 digits)." });
  if (await User.exists({ email })) return res.status(409).json({ message: "An account with this email already exists." });
  const user = await User.create({ name, email, whatsapp, role, passwordHash: await bcrypt.hash(password, 12) });
  res.status(201).json({ user: publicUser(user) });
};
const setUserStatus = async (req, res) => {
  if (typeof req.body.active !== "boolean") return res.status(400).json({ message: "Active must be true or false." });
  const active = req.body.active;
  if (String(req.user._id) === req.params.id && !active) {
    return res.status(400).json({ message: "You cannot deactivate your own admin account." });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });
  if (user.role === "admin") return res.status(403).json({ message: "Admin account status cannot be changed." });
  user.active = active;
  if (!active) user.tokenVersion += 1;
  await user.save();
  if (!active) forceLogout(user._id);
  res.json({ user: publicUser(user) });
};
const resetPassword = async (req, res) => {
  const password = req.body.password;
  if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72) return res.status(400).json({ message: "Use at least 8 characters and at most 72 UTF-8 bytes." });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { passwordHash }, $inc: { tokenVersion: 1 } }, { new: true });
  if (!user) return res.status(404).json({ message: "User not found." });
  res.json({ message: "Password changed. Existing sessions have been signed out." });
  forceLogout(user._id);
};
module.exports = { listUsers, listSellers, createUser, setUserStatus, resetPassword };
