const reportsService = require("../services/reports.service");

const create = async (req, res) => {
    try {
        const userId = req.user?.id || null;
        const report = await reportsService.create(req.body, userId);
        res.status(201).json({ ok: true, report });
    } catch (err) {
        res.status(400).json({ ok: false, message: err.message });
    }
};

const getAll = async (req, res) => {
    try {
        const reports = await reportsService.getAll(req.query);
        res.status(200).json({ ok: true, reports });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
};

const getById = async (req, res) => {
    try {
        const report = await reportsService.getById(req.params.id);
        res.status(200).json({ ok: true, report });
    } catch (err) {
        res.status(404).json({ ok: false, message: err.message });
    }
};

module.exports = { create, getAll, getById };
