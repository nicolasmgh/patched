const prisma = require("../utils/prisma");

// ─── CONFIRMACIONES ───────────────────────────────────

const confirm = async (reportId, userId) => {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error("Reporte no encontrado");
    if (report.userId === userId)
        throw new Error("No podés confirmar tu propio reporte");

    const existing = await prisma.confirmation.findUnique({
        where: { reportId_userId: { reportId, userId } },
    });
    if (existing) throw new Error("Ya confirmaste este reporte");

    const confirmation = await prisma.confirmation.create({
        data: { reportId, userId },
    });

    // Sumar reputación al dueño del reporte
    if (report.userId) {
        await prisma.user.update({
            where: { id: report.userId },
            data: { reputation: { increment: 1 } },
        });
    }

    return confirmation;
};

const unconfirm = async (reportId, userId) => {
    const existing = await prisma.confirmation.findUnique({
        where: { reportId_userId: { reportId, userId } },
    });
    if (!existing) throw new Error("No habías confirmado este reporte");

    await prisma.confirmation.delete({
        where: { reportId_userId: { reportId, userId } },
    });

    // Restar reputación
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (report?.userId) {
        await prisma.user.update({
            where: { id: report.userId },
            data: { reputation: { decrement: 1 } },
        });
    }

    return { unconfirmed: true };
};

// ─── FOLLOWS ─────────────────────────────────────────

const follow = async (reportId, userId) => {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error("Reporte no encontrado");

    const existing = await prisma.follow.findUnique({
        where: { reportId_userId: { reportId, userId } },
    });
    if (existing) throw new Error("Ya estás siguiendo este reporte");

    const followRecord = await prisma.follow.create({
        data: { reportId, userId },
    });

    return followRecord;
};

const unfollow = async (reportId, userId) => {
    const existing = await prisma.follow.findUnique({
        where: { reportId_userId: { reportId, userId } },
    });
    if (!existing) throw new Error("No estabas siguiendo este reporte");

    await prisma.follow.delete({
        where: { reportId_userId: { reportId, userId } },
    });

    return { unfollowed: true };
};

// ─── LIKES DE COMENTARIOS ────────────────────────────

const likeComment = async (commentId, userId) => {
    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
    });
    if (!comment) throw new Error("Comentario no encontrado");
    if (comment.userId === userId)
        throw new Error("No podés likear tu propio comentario");

    const existing = await prisma.commentLike.findUnique({
        where: { commentId_userId: { commentId, userId } },
    });
    if (existing) throw new Error("Ya likeaste este comentario");

    const like = await prisma.commentLike.create({
        data: { commentId, userId },
    });

    return like;
};

const unlikeComment = async (commentId, userId) => {
    const existing = await prisma.commentLike.findUnique({
        where: { commentId_userId: { commentId, userId } },
    });
    if (!existing) throw new Error("No habías likeado este comentario");

    await prisma.commentLike.delete({
        where: { commentId_userId: { commentId, userId } },
    });

    return { unliked: true };
};

module.exports = {
    confirm,
    unconfirm,
    follow,
    unfollow,
    likeComment,
    unlikeComment,
};
