const router = require("express").Router();
const {
    create,
    getAll,
    getById,
    suggest,
} = require("../controllers/reports.controller");
const { authenticate, optionalAuthenticate } = require("../middlewares/auth.middleware");

// PÃºblicos
router.get("/", optionalAuthenticate, getAll);
router.get("/:id", optionalAuthenticate, getById);

// Requieren login
router.post("/", authenticate, create);
router.post("/:id/suggest", authenticate, suggest);

module.exports = router;
