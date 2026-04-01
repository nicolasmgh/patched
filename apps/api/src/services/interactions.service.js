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

    // Sumar reputación al que confirma (el usuario gana 1 pto)
    await prisma.user.update({
        where: { id: userId },
        data: { reputation: { increment: 1 } },
    });

    // Sumar reputación al dueño del reporte
    if (report.userId) {
        await prisma.user.update({
            where: { id: report.userId },
            data: { reputation: { increment: 1 } },
        });
    }

    // Verificar si gana badge FISCALIZADOR
    const userConfirmations = await prisma.confirmation.count({
        where: { userId },
    });
    if (userConfirmations === 5) {
        const badge = await prisma.badge.findUnique({
            where: { name: "FISCALIZADOR" },
        });
        if (badge) {
            await prisma.userBadge
                .create({
                    data: { userId, badgeId: badge.id },
                })
                .catch(() => {}); // ignorar si ya lo tiene
        }
    }

    const confirmationCount = await prisma.confirmation.count({
        where: { reportId },
    });

    // Auto-aprobación estilo Waze
    if (report.status === "PENDING" && confirmationCount >= 10) {
        await prisma.report.update({
            where: { id: reportId },
            data: { status: "APPROVED" },
        });

        await prisma.media.updateMany({
            where: { reportId, status: "PENDING" },
            data: { status: "APPROVED" },
        });

        if (report.userId) {
            const notif = await prisma.notification.create({
                data: {
                    userId: report.userId,
                    type: "REPORT_APPROVED",
                    message: `¡Tu reporte "${report.title}" alcanzó las 10 confirmaciones y fue auto-aprobado por la comunidad!`,
                    data: { reportId, status: "APPROVED" },
                },
            });
            const { emitNotification } = require("../utils/socket");
            emitNotification(notif);
        }
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

    // Restar reputación al que des-confirma
    await prisma.user.update({
        where: { id: userId },
        data: { reputation: { decrement: 1 } },
    });

    // Restar reputación al dueño del reporte
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

// ─── VOTOS DE COMENTARIOS ──────────────────────────────────────────────────

const voteComment = async (commentId, userId, value) => {
    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
    });
    if (!comment) throw new Error("Comentario no encontrado");

    if (value === 0) {
        const existing = await prisma.commentVote.findUnique({
            where: { commentId_userId: { commentId, userId } },
        });
        if (existing) {
            await prisma.commentVote.delete({
                where: { commentId_userId: { commentId, userId } },
            });
        }
        return { deleted: true };
    }

    const existing = await prisma.commentVote.findUnique({
        where: { commentId_userId: { commentId, userId } },
    });

    let vote;
    if (existing) {
        vote = await prisma.commentVote.update({
            where: { commentId_userId: { commentId, userId } },
            data: { value },
        });
    } else {
        vote = await prisma.commentVote.create({
            data: { commentId, userId, value },
        });

        if (value === 1 && comment.userId && comment.userId !== userId) {
            const liker = await prisma.user.findUnique({
                where: { id: userId },
            });
            if (liker) {
                const notif = await prisma.notification.create({
                    data: {
                        userId: comment.userId,
                        type: "COMMENT_LIKED",
                        message: `@${liker.username || liker.firstName} le dio un upvote a tu comentario.`,
                        data: {
                            reportId: comment.reportId,
                            commentId,
                            likerId: userId,
                            preview:
                                comment.content.length > 50
                                    ? comment.content.substring(0, 50) + "..."
                                    : comment.content,
                        },
                    },
                });
                const { emitNotification } = require("../utils/socket");
                emitNotification(notif);
            }
        }
    }

    return vote;
};

module.exports = {
    confirm,
    unconfirm,
    follow,
    unfollow,
    voteComment,
};
