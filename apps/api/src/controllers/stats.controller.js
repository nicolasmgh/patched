const statsService = require("../services/stats.service");

const getPublicStats = async (req, res) => {
    try {
        const data = await statsService.getPublicStats();
        res.status(200).json({ ok: true, ...data });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
};

const getRankingByCity = async (req, res) => {
    try {
        const data = await statsService.getRankingByCity();
        res.status(200).json({ ok: true, ranking: data });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
};

const getAbandonmentIndex = async (req, res) => {
    try {
        const data = await statsService.getAbandonmentIndex();
        res.status(200).json({ ok: true, abandonment: data });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
};

const getAvgResolutionTime = async (req, res) => {
    try {
        const data = await statsService.getAvgResolutionTime();
        res.status(200).json({ ok: true, resolutionTime: data });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
};

const getHeatmapData = async (req, res) => {
    try {
        const data = await statsService.getHeatmapData();
        res.status(200).json({ ok: true, points: data });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
};

const getTopUsers = async (req, res) => {
    try {
        const users = await statsService.getTopUsers();
        res.status(200).json({ ok: true, users });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
};

module.exports = {
    getPublicStats,
    getRankingByCity,
    getAbandonmentIndex,
    getAvgResolutionTime,
    getHeatmapData,
    getTopUsers,
};
