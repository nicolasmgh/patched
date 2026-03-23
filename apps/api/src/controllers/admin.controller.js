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

module.exports = { changeStatus, modifyReport, getActionLogs, getDashboard };
