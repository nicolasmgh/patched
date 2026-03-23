const interactionsService = require("../services/interactions.service");

const confirm = async (req, res) => {
    try {
        const result = await interactionsService.confirm(
            req.params.reportId,
            req.user.id,
        );
        res.status(201).json({ ok: true, confirmation: result });
    } catch (err) {
        res.status(400).json({ ok: false, message: err.message });
    }
};

const unconfirm = async (req, res) => {
    try {
        const result = await interactionsService.unconfirm(
            req.params.reportId,
            req.user.id,
        );
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        res.status(400).json({ ok: false, message: err.message });
    }
};

const follow = async (req, res) => {
    try {
        const result = await interactionsService.follow(
            req.params.reportId,
            req.user.id,
        );
        res.status(201).json({ ok: true, follow: result });
    } catch (err) {
        res.status(400).json({ ok: false, message: err.message });
    }
};

const unfollow = async (req, res) => {
    try {
        const result = await interactionsService.unfollow(
            req.params.reportId,
            req.user.id,
        );
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        res.status(400).json({ ok: false, message: err.message });
    }
};

module.exports = { confirm, unconfirm, follow, unfollow };
