const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

module.exports = (req, res, next) => {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const state = attempts.get(key);
  if (!state || now > state.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }
  state.count += 1;
  if (state.count > MAX_ATTEMPTS) {
    res.set("Retry-After", String(Math.ceil((state.resetAt - now) / 1000)));
    return res.status(429).json({ message: "Too many sign-in attempts. Please try again later." });
  }
  next();
};
