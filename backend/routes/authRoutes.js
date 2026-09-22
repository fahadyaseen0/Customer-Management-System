const router = require("express").Router();
const { login, me, events } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const loginRateLimit = require("../middleware/loginRateLimit");
router.post("/login", loginRateLimit, asyncHandler(login));
router.get("/me", authenticate, me);
router.get("/events", authenticate, events);
module.exports = router;
