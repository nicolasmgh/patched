const commentsService = require("../services/comments.service");

const create = async (req, res) => {
    try {
        const comment = await commentsService.create(
            req.params.reportId,
            req.user.id,
            req.body,
        );
        res.status(201).json({ ok: true, comment });
    } catch (err) {
        res.status(400).json({ ok: false, message: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const result = await commentsService.remove(
            req.params.commentId,
            req.user.id,
            req.user.role,
        );
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        res.status(400).json({ ok: false, message: err.message });
    }
};

const flag = async (req, res) => {
    try {
        const result = await commentsService.flag(
            req.params.commentId,
            req.user.id,
            req.user.role,
        );
        res.status(200).json({ ok: true, comment: result });
    } catch (err) {
        res.status(403).json({ ok: false, message: err.message });
    }
};

module.exports = { create, remove, flag };
