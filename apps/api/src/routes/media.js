const router = require("express").Router();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const path = require("path");
const {
    upload,
    uploadCommentMedia,
    remove,
} = require("../controllers/media.controller");
const { authenticate } = require("../middlewares/auth.middleware");

// Configurar Cloudinary (Gratuito)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Guardar en la nube en lugar del disco duro
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const isVideo = file.mimetype.startsWith("video/");
        return {
            folder: "patched_uploads",
            resource_type: isVideo ? "video" : "image",
            allowed_formats: ["jpg", "jpeg", "png", "webp", "mp4"],
            public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
        };
    },
});

const fileFilter = (req, file, cb) => {
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".mp4"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext) || file.mimetype.startsWith('video/')) {
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
router.post(
    "/comment/:commentId",
    authenticate,
    uploader.array("files", 3),
    uploadCommentMedia,
);
router.delete("/:mediaId", authenticate, remove);

module.exports = router;
