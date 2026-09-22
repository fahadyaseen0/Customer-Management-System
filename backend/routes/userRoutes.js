const router = require("express").Router();
const { authenticate, adminOnly } = require("../middleware/auth");
const { listUsers, createUser, setUserStatus, resetPassword } = require("../controllers/userController");
const asyncHandler = require("../utils/asyncHandler");
router.use(authenticate);
router.patch("/me/phone", asyncHandler(async (req, res) => {
  const phone = require("../utils/validation").normalizePhone(req.body.whatsapp);
  if (!/^[1-9]\d{7,14}$/.test(phone)) return res.status(400).json({ message: "Enter an international number (8–15 digits)." });
  req.user.whatsapp = phone;
  await req.user.save();
  res.json({ user: require("../controllers/authController").publicUser(req.user) });
}));
router.get("/", adminOnly, asyncHandler(listUsers));
router.post("/", adminOnly, asyncHandler(createUser));
router.patch("/:id/password", adminOnly, asyncHandler(resetPassword));
router.patch("/:id/status", adminOnly, asyncHandler(setUserStatus));
module.exports = router;
