const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeEmail, normalizePhone, isEmail, escapeRegex, safeText } = require("../utils/validation");

test("normalizes login identifiers", () => {
  assert.equal(normalizeEmail(" Staff@Gmail.COM "), "staff@gmail.com");
  assert.equal(normalizePhone("+92 300-1234567"), "923001234567");
});

test("validates email and safely escapes searches", () => {
  assert.equal(isEmail("staff@gmail.com"), true);
  assert.equal(isEmail("not-an-email"), false);
  assert.equal(escapeRegex("Ali (Lahore).*"), "Ali \\(Lahore\\)\\.\\*");
});

test("trims and limits user text", () => {
  assert.equal(safeText("  Customer Name  ", 8), "Customer");
});
