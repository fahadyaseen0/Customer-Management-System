const jwt = require("jsonwebtoken");
const User = require("../models/User");

const readToken = (req) => {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  return "";
};

const authenticate = async (req, res, next) => {
  try {
    const token = readToken(req);
    if (!token) return res.status(401).json({ message: "Please sign in." });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.active || user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ message: "Your session is no longer active.", code: "SESSION_REVOKED" });
    }
    req.user = user;
    next();
  } catch (_error) {
    return res.status(401).json({ message: "Your session has expired. Please sign in again." });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access is required." });
  next();
};
module.exports = { authenticate, adminOnly };
