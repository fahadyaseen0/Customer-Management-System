const test = require("node:test");
const assert = require("node:assert/strict");
process.env.JWT_SECRET = "test-only-secret";
const { cutoffFor } = require("../utils/retention");
test("calendar retention clamps month-end and retains exact time", () => {
  assert.equal(cutoffFor(new Date("2026-03-31T12:30:00Z"), 1).toISOString(), "2026-02-28T12:30:00.000Z");
  assert.equal(cutoffFor(new Date("2024-03-31T12:30:00Z"), 1).toISOString(), "2024-02-29T12:30:00.000Z");
  assert.equal(cutoffFor(new Date("2026-01-15T12:30:00Z"), 2).toISOString(), "2025-11-15T12:30:00.000Z");
});
test("send uses assigned Staff for User and Admin, ignoring actor and supplied recipient", async () => {
  const Customer = require("../models/Customer");
  const controller = require("../controllers/customerController");
  const Staff = require("../models/Staff");
  const oldStaff = Staff.findById;
  Staff.findById = async () => ({phone:"923009999999"});
  const oldFind = Customer.findById, oldFetch = global.fetch;
  process.env.BOTLINKD_APP_KEY = "test-token";
  process.env.BOTLINKD_AUTH_KEY = "fixed-admin-api-number";
  process.env.BOTLINKD_IMAGE_TEMPLATE = "customer_image";
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url, payload: Object.fromEntries(options.body) });
    return { ok: true, json: async () => ({ messages: [{ id: "accepted" }] }) };
  };
  try {
    for (const role of ["user", "admin"]) {
      const doc = { url: "https://example.com/test.jpg", resourceType: "image" };
      Customer.findById = async () => ({ name: "Customer", staff: "assigned", seller: { whatsapp: "999" }, documents: { id: () => doc }, save: async () => {} });
      let result;
      await controller.send({ params: { id: "c", docId: "d" }, user: { _id: "actor", role, whatsapp: "923001234567" }, body: { recipient: "999", staffId: "outsider" } }, { json: value => { result = value; } });
      assert.equal(result.notification.status, "sent");
      assert.equal(doc.lastSend.recipient, "923009999999");
      assert.equal(requests.at(-1).payload.to, "923009999999");
      assert.equal(requests.at(-1).url,"https://botlinkd.com/api/whatsapp/template");
    }
    assert.equal(requests.length, 2);
  } finally { Customer.findById = oldFind; Staff.findById = oldStaff; global.fetch = oldFetch; }
});
test("protected endpoints deny anonymous and User admin access; deactivation revokes JWT", async () => {
  const app = require("../server"), User = require("../models/User"), jwt = require("jsonwebtoken");
  const oldFind = User.findById;
  let active = true;
  User.findById = async () => ({ _id: "actor", role: "user", active, tokenVersion: 0 });
  const server = app.listen(0, "127.0.0.1"); await new Promise(resolve => server.once("listening", resolve));
  const url = "http://127.0.0.1:" + server.address().port;
  const token = jwt.sign({ sub: "actor", tokenVersion: 0 }, process.env.JWT_SECRET);
  const headers = { Authorization: "Bearer " + token };
  try {
    assert.equal((await fetch(url + "/api/customers")).status, 401);
    assert.equal((await fetch(url + "/api/customers/stats", { headers })).status, 403);
    assert.equal((await fetch(url + "/api/users", { headers })).status, 403);
    assert.equal((await fetch(url + "/api/staff", { method: "POST", headers })).status, 403);
    assert.equal((await fetch(url + "/api/users/actor/password", {method:"PATCH", headers})).status, 403);
    active = false;
    assert.equal((await fetch(url + "/api/auth/me", { headers })).status, 401);
  } finally { User.findById = oldFind; await new Promise(resolve => server.close(resolve)); }
});
test("document model accepts multiple staff-tagged documents without seller selection", async () => {
  const Customer = require("../models/Customer"), mongoose = require("mongoose");
  const id = new mongoose.Types.ObjectId();
  const c = new Customer({ name: "Ali", city: "Lahore", savedBy: {user: id, name: "Operator"},
    documents: [{ staff: id, staffName: "Field A", url: "a" }, { staff: id, staffName: "Field B", url: "b" }] });
  await c.validate();
  assert.equal(c.documents.length, 2);
  assert.notEqual(String(c.documents[0]._id), String(c.documents[1]._id));
});
