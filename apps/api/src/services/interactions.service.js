const prisma = require("../utils/prisma");

// â”€â”€â”€ CONFIRMACIONES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const confirm = async (reportId, userId) => {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error("Reporte no encontrado");
    if (report.userId === userId)
        throw new Error("No podÃ©s confirmar tu propio reporte");

    const existing = await prisma.confirmation.findUnique({
        where: { reportId_userId: { reportId, userId } },
    });
    if (existing) throw new Error("Ya confirmaste este reporte");

    const confirmation = await prisma.confirmation.create({
        data: { reportId, userId },
    });

    // Sumar reputaciÃ³n al dueÃ±o del reporte
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
    if (!existing) throw new Error("No habÃ­as confirmado este reporte");

    await prisma.confirmation.delete({
        where: { reportId_userId: { reportId, userId } },
    });

    // Restar reputaciÃ³n
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (report?.userId) {
        await prisma.user.update({
            where: { id: report.userId },
            data: { reputation: { decrement: 1 } },
        });
    }

    return { unconfirmed: true };
};

// â”€â”€â”€ FOLLOWS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const follow = async (reportId, userId) => {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error("Reporte no encontrado");

    const existing = await prisma.follow.findUnique({
        where: { reportId_userId: { reportId, userId } },
    });
    if (existing) throw new Error("Ya estÃ¡s siguiendo este reporte");

    const followRecord = await prisma.follow.create({
        data: { reportId, userId },
    });

    if (report.userId && report.userId !== userId) {
        const follower = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (follower) {
            const notif = await prisma.notification.create({
                data: {
                    userId: report.userId,
                    type: "REPORT_FOLLOWED",
                    message: `@${follower.username || follower.firstName} comenzó a seguir tu reporte "${report.title}".`,
                    data: { reportId, followerId: userId },
                },
            });
            const { emitNotification } = require("../utils/socket");
            emitNotification(notif);
        }
    }

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

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (report && report.userId) {
        const notifs = await prisma.notification.findMany({
            where: { userId: report.userId, type: "REPORT_FOLLOWED" },
        });
        const toDelete = notifs.filter(
            (n) =>
                n.data?.reportId === reportId && n.data?.followerId === userId,
        );
        for (const n of toDelete) {
            await prisma.notification.delete({ where: { id: n.id } });
        }
    }
    return { unfollowed: true };
};

// â”€â”€â”€ LIKES DE COMENTARIOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const likeComment = async (commentId, userId) => {
    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
    });
    if (!comment) throw new Error("Comentario no encontrado");
    if (comment.userId === userId)
        throw new Error("No podÃ©s likear tu propio comentario");

    const existing = await prisma.commentLike.findUnique({
        where: { commentId_userId: { commentId, userId } },
    });
    if (existing) throw new Error("Ya likeaste este comentario");

    const like = await prisma.commentLike.create({
        data: { commentId, userId },
    });

    if (comment.userId && comment.userId !== userId) {
        const liker = await prisma.user.findUnique({ where: { id: userId } });
        if (liker) {
            const notif = await prisma.notification.create({
                data: {
                    userId: comment.userId,
                    type: "COMMENT_LIKED",
                    message: `@${liker.username || liker.firstName} le dio me gusta a tu comentario.`,
                    data: {
                        reportId: comment.reportId,
                        commentId,
                        likerId: userId,
                        preview: comment.content.length > 50 ? comment.content.substring(0, 50) + "..." : comment.content
                    },
                },
            });
            const { emitNotification } = require("../utils/socket");
            emitNotification(notif);
        }
    }

    return like;
};

const unlikeComment = async (commentId, userId) => {
    const existing = await prisma.commentLike.findUnique({
        where: { commentId_userId: { commentId, userId } },
    });
    if (!existing) throw new Error("No habÃ­as likeado este comentario");

    await prisma.commentLike.delete({
        where: { commentId_userId: { commentId, userId } },
    });

    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
    });
    if (comment && comment.userId) {
        const notifs = await prisma.notification.findMany({
            where: { userId: comment.userId, type: "COMMENT_LIKED" },
        });
        const toDelete = notifs.filter(
            (n) =>
                n.data?.commentId === commentId && n.data?.likerId === userId,
        );
        for (const n of toDelete) {
            await prisma.notification.delete({ where: { id: n.id } });
        }
    }

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
