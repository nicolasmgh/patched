const mediaService = require("../services/media.service");

const upload = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res
                .status(400)
                .json({ ok: false, message: "No se recibieron archivos" });
        }

        const { reportId } = req.params;
        const { isBefore, isAfter } = req.body;

        const media = await mediaService.attachToReport(reportId, req.files, req.user.id, {
            isBefore: isBefore === "true",
            isAfter: isAfter === "true",
        });

        res.status(201).json({ ok: true, media });
    } catch (err) {
        res.status(400).json({ ok: false, message: err.message });
    }
};

const uploadCommentMedia = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res
                .status(400)
                .json({ ok: false, message: "No se recibieron archivos" });
        }

        const { commentId } = req.params;
        const media = await mediaService.attachToComment(commentId, req.files, req.user.id);

        res.status(201).json({ ok: true, media });
    } catch (err) {
        res.status(400).json({ ok: false, message: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const result = await mediaService.deleteMedia(
            req.params.mediaId,
            req.user.id,
            req.user.role,
        );
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        res.status(400).json({ ok: false, message: err.message });
    }
};

module.exports = { upload, uploadCommentMedia, remove };

