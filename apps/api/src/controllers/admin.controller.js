const adminService = require("../services/admin.service");

const changeStatus = async (req, res) => {
    try {
        const { status, details } = req.body;
        const report = await adminService.changeStatus(
            req.params.reportId,
            status,
            req.user.id,
            details,
        );
        res.status(200).json({ ok: true, report });
    } catch (err) {
        res.status(400).json({ ok: false, message: err.message });
    }
};

const modifyReport = async (req, res) => {
    try {
        const report = await adminService.modifyReport(
            req.params.reportId,
            req.body,
            req.user.id,
        );
        res.status(200).json({ ok: true, report });
    } catch (err) {
        res.status(400).json({ ok: false, message: err.message });
    }
};

const getActionLogs = async (req, res) => {
    try {
        const logs = await adminService.getActionLogs(req.query);
        res.status(200).json({ ok: true, logs });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
};

const getDashboard = async (req, res) => {
    try {
        const data = await adminService.getDashboard();
        res.status(200).json({ ok: true, ...data });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await adminService.getUsers();
        res.status(200).json({ ok: true, users });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
};

const updateUserRole = async (req, res) => {
    try {
        const user = await adminService.updateUserRole(
            req.params.userId,
            req.body.role,
            req.user.id,
        );
        res.status(200).json({ ok: true, user });
    } catch (err) {
        res.status(400).json({ ok: false, message: err.message });
    }
};

const getSuggestions = async (req, res) => {
    try {
        const suggestions = await adminService.getSuggestions(req.query.status);
        res.status(200).json({ ok: true, suggestions });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
};

const updateSuggestionStatus = async (req, res) => {
    try {
        const suggestion = await adminService.updateSuggestionStatus(
            req.params.id,
            req.body.status,
        );
        res.status(200).json({ ok: true, suggestion });
    } catch (err) {
        res.status(400).json({ ok: false, message: err.message });
    }
};

const getPendingMedia = async (req, res) => {
    try {
        const media = await adminService.getPendingMedia();
        res.status(200).json({ ok: true, media });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
};

const updateMediaStatus = async (req, res) => {
    try {
        const media = await adminService.updateMediaStatus(
            req.params.id,
            req.body.status
        );
        res.status(200).json({ ok: true, media });
    } catch (err) {
        res.status(400).json({ ok: false, message: err.message });
    }
};

module.exports = {
    changeStatus,
    modifyReport,
    getActionLogs,
    getDashboard,
    getUsers,
    updateUserRole,
    getSuggestions,
    updateSuggestionStatus,
    getPendingMedia,
    updateMediaStatus,
};
