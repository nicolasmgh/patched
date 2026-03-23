const router = require("express").Router();
const {
    create,
    getAll,
    getById,
} = require("../controllers/reports.controller");
const { authenticate } = require("../middlewares/auth.middleware");

// Públicos
router.get("/", getAll);
router.get("/:id", getById);

// Requieren login
router.post("/", authenticate, create);

module.exports = router;
