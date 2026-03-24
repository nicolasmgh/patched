const router = require("express").Router();
const {
    create,
    getAll,
    getById,
    suggest,
} = require("../controllers/reports.controller");
const { authenticate } = require("../middlewares/auth.middleware");

// Públicos
router.get("/", getAll);
router.get("/:id", getById);

// Requieren login
router.post("/", authenticate, create);
router.post("/:id/suggest", authenticate, suggest);

module.exports = router;
