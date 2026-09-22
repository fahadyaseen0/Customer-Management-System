const normalizeEmail = (value = "") => String(value).trim().toLowerCase();
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
const normalizePhone = (value = "") => String(value).replace(/[^\d]/g, "");
const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const safeText = (value, maxLength = 120) => String(value || "").trim().slice(0, maxLength);
module.exports = { normalizeEmail, normalizePhone, isEmail, escapeRegex, safeText };
