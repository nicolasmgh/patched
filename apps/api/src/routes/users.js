const router = require("express").Router();
const {
    getMyProfile,
    updateMyProfile,
    getNotifications,
    markNotificationsRead,
    getPublicProfile,
    search,
} = require("../controllers/users.controller");
const { authenticate } = require("../middlewares/auth.middleware");

router.get("/me", authenticate, getMyProfile);
router.patch("/me", authenticate, updateMyProfile);
router.get("/me/notifications", authenticate, getNotifications);
router.patch("/me/notifications/read", authenticate, markNotificationsRead);
router.get("/search", search);
router.get("/:userId", getPublicProfile);

module.exports = router;

