const router = require("express").Router();
const {
    getPublicStats,
    getRankingByCity,
    getAbandonmentIndex,
    getAvgResolutionTime,
    getHeatmapData,
    getTopUsers,
} = require("../controllers/stats.controller");

// Todos pÃºblicos
router.get("/", getPublicStats);
router.get("/ranking", getRankingByCity);
router.get("/abandonment", getAbandonmentIndex);
router.get("/resolution-time", getAvgResolutionTime);
router.get("/heatmap", getHeatmapData);
router.get("/leaderboard", getTopUsers);

module.exports = router;
