const router = require("express").Router();
const { authenticate, adminOnly } = require("../middleware/auth");
const { getSettings, updateSettings, cleanupNow } = require("../controllers/settingController");
const asyncHandler = require("../utils/asyncHandler");
router.use(authenticate, adminOnly);
router.get("/", asyncHandler(getSettings));
router.put("/", asyncHandler(updateSettings));
router.post("/cleanup", asyncHandler(cleanupNow));
module.exports = router;
