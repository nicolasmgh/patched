const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const { upload, remove } = require("../controllers/media.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".mp4"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error("Formato no permitido. Solo JPG, PNG, WEBP o MP4"), false);
    }
};

const uploader = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB máximo
});

router.post(
    "/report/:reportId",
    authenticate,
    uploader.array("files", 5),
    upload,
);
router.delete("/:mediaId", authenticate, remove);

module.exports = router;
