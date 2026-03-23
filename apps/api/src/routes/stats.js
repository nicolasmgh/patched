const router = require("express").Router();
const {
    getPublicStats,
    getRankingByCity,
    getAbandonmentIndex,
    getAvgResolutionTime,
    getHeatmapData,
} = require("../controllers/stats.controller");

// Todos públicos
router.get("/", getPublicStats);
router.get("/ranking", getRankingByCity);
router.get("/abandonment", getAbandonmentIndex);
router.get("/resolution-time", getAvgResolutionTime);
router.get("/heatmap", getHeatmapData);

module.exports = router;
