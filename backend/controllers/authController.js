const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { normalizeEmail } = require("../utils/validation");
const { addConnection } = require("../services/sessionEvents");

const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email,
  whatsapp: user.whatsapp, role: user.role, active: user.active });

const login = async (req, res) => {
  const { email, password, adminMode = false } = req.body;
  if (typeof adminMode !== "boolean") return res.status(400).json({ message: "Invalid login mode." });
  const user = await User.findOne({ email: normalizeEmail(email) }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(String(password || ""), user.passwordHash))) {
    return res.status(401).json({ message: "Email or password is incorrect." });
  }
  if (!user.active) return res.status(403).json({ message: "This account is inactive. Contact the administrator." });
  if (adminMode && user.role !== "admin") return res.status(403).json({ message: "This account does not have admin access." });
  if (!adminMode && user.role !== "user") return res.status(403).json({ message: "Use Admin Login for an admin account." });
  user.lastLoginAt = new Date();
  await user.save();
  const token = jwt.sign({ sub: String(user._id), role: user.role, tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "8h" });
  res.json({ token, user: publicUser(user) });
};
const me = (req, res) => res.json({ user: publicUser(req.user) });
const events = (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders?.();
  res.write("event: connected\ndata: {}\n\n");
  const remove = addConnection(req.user._id, res);
  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25000);
  req.on("close", () => { clearInterval(heartbeat); remove(); });
};
module.exports = { login, me, events, publicUser };
