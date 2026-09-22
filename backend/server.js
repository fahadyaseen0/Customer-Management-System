const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
require("dotenv").config();

const User = require("./models/User");
const { runCleanup } = require("./services/cleanup");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is required. Copy .env.example to .env and configure it.");
  process.exit(1);
}

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5174")
  .split(",").map((item) => item.trim());
app.disable("x-powered-by");
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/customers", require("./routes/customerRoutes"));
app.use("/api/settings", require("./routes/settingRoutes"));
app.use("/api/staff", require("./routes/staffRoutes"));

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = ["ValidationError", "CastError"].includes(error.name) || error.message === "Unsupported file type." || error.code === "LIMIT_FILE_SIZE" ? 400 : 500;
  const message = error.code === "LIMIT_FILE_SIZE" ? "File must be smaller than 8 MB." : error.message;
  res.status(status).json({ message: status === 500 ? "Something went wrong on the server." : message });
});

const ensureAdmin = async () => {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");
  if (!email || password.length < 8 || (await User.exists({ role: "admin" }))) return;
  await User.create({ name: process.env.ADMIN_NAME || "System Admin", email,
    passwordHash: await bcrypt.hash(password, 12), role: "admin", active: true });
  console.log("Initial admin account created.");
};

const startServer = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await require("./services/migrate")();
  await ensureAdmin();
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`CustomerHub API running on port ${port}`));
  setInterval(() => runCleanup().catch(console.error), 60 * 60 * 1000).unref();
  runCleanup().catch(console.error);
};

if (require.main === module) {
  startServer().catch((error) => { console.error("Server startup failed:", error.message); process.exit(1); });
}
module.exports = app;
