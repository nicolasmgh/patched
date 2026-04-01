const router = require("express").Router();
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/avatar/");
    },
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `avatar-${unique}${path.extname(file.originalname)}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error("Formato no permitido. Solo JPG, PNG o WEBP"), false);
    }
};

const uploader = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
});

const {
    getMyProfile,
    updateMyProfile,
    getNotifications,
    markNotificationsRead,
    markNotificationRead,
    getPublicProfile,
    search,
} = require("../controllers/users.controller");
const { authenticate, optionalAuthenticate } = require("../middlewares/auth.middleware");

router.get("/me", authenticate, getMyProfile);
router.patch("/me", authenticate, uploader.single("avatar"), updateMyProfile);
router.get("/me/notifications", authenticate, getNotifications);
router.patch("/me/notifications/read", authenticate, markNotificationsRead);
router.patch("/me/notifications/:id/read", authenticate, markNotificationRead);
router.get("/search", search);
router.get("/:userId", optionalAuthenticate, getPublicProfile);

module.exports = router;
