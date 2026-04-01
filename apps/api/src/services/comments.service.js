const { getIO } = require("../utils/socket");
const prisma = require("../utils/prisma");

const create = async (reportId, userId, { content }) => {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error("Reporte no encontrado");
    if (!content?.trim()) throw new Error("El comentario no puede estar vacío");

    // Filtro anti-spam de comentarios duplicados
    const recentSameComment = await prisma.comment.findFirst({
        where: {
            userId,
            reportId,
            content: content.trim(),
            createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // 5 min
        },
    });

    if (recentSameComment) {
        throw new Error(
            "Anti-SPAM: Ya enviaste un comentario idéntico recientemente.",
        );
    }

    const comment = await prisma.comment.create({
        data: {
            content: content.trim(),
            reportId,
            userId,
        },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    hideLastName: true,
                    avatarUrl: true,
                    reputation: true,
                },
            },
        },
    });

    const mentions = content.match(/@([a-zA-Z0-9_]+)/g) || [];
    const mentionedUsernames = mentions.map((m) => m.substring(1));

    if (mentionedUsernames.length > 0) {
        const usersToNotify = await prisma.user.findMany({
            where: { username: { in: mentionedUsernames } },
        });

        await Promise.all(
            usersToNotify.map(async (u) => {
                if (u.id !== userId) {
                    const notif = await prisma.notification.create({
                        data: {
                            userId: u.id,
                            type: "USER_MENTIONED",
                            message: `Has sido mencionado en un comentario del reporte "${report.title}".`,
                            data: {
                                reportId,
                                commentId: comment.id,
                                preview:
                                    content.length > 50
                                        ? content.substring(0, 50) + "..."
                                        : content,
                            },
                        },
                    });
                    const { emitNotification } = require("../utils/socket");
                    emitNotification(notif);
                    return notif;
                }
            }),
        );
    }

    // Reputación al dueño del reporte
    if (report.userId && report.userId !== userId) {
        await prisma.user.update({
            where: { id: report.userId },
            data: { reputation: { increment: 1 } },
        });
    }

    // Reputación al comentarista (quien hizo el comentario)
    await prisma.user.update({
        where: { id: userId },
        data: { reputation: { increment: 1 } },
    });

    const commentsCount = await prisma.comment.count({
        where: { userId, flagged: false },
    });
    if (commentsCount === 5) {
        const b = await prisma.badge.findUnique({
            where: { name: "RESEÑADOR_EXPERTO" },
        });
        if (b) {
            await prisma.userBadge
                .upsert({
                    where: { userId_badgeId: { userId, badgeId: b.id } },
                    update: {},
                    create: { userId, badgeId: b.id },
                })
                .catch(() => {});
        }
    }

    if (comment.user.hideLastName) comment.user.lastName = null;

    try {
        console.log("Emitiendo evento commentAdded para reporte:", reportId);
        getIO().emit("commentAdded", comment);
    } catch (e) {
        console.error("Error al emitir commentAdded:", e.message);
    }

    return comment;
};

const remove = async (commentId, userId, userRole) => {
    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
    });
    if (!comment) throw new Error("Comentario no encontrado");

    const isOwner = comment.userId === userId;
    const isPrivileged = ["ADMIN", "COLLABORATOR"].includes(userRole);

    if (!isOwner && !isPrivileged) {
        throw new Error("No tenés permisos para eliminar este comentario");
    }

    if (isOwner && !isPrivileged) {
        const timeDiff = (new Date() - new Date(comment.createdAt)) / 1000 / 60;
        if (timeDiff > 5) {
            throw new Error(
                "Solo podés eliminar tu comentario dentro de los primeros 5 minutos",
            );
        }
    }

    await prisma.comment.delete({ where: { id: commentId } });

    return { deleted: true };
};

const edit = async (commentId, userId, newContent) => {
    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
    });
    if (!comment) throw new Error("Comentario no encontrado");

    if (comment.userId !== userId)
        throw new Error("Solo podés editar tus propios comentarios");
    if (!newContent?.trim())
        throw new Error("El comentario no puede estar vacío");

    const timeDiff = (new Date() - new Date(comment.createdAt)) / 1000 / 60;
    if (timeDiff > 5)
        throw new Error(
            "Solo podés editar tu comentario dentro de los primeros 5 minutos",
        );

    return await prisma.comment.update({
        where: { id: commentId },
        data: { content: newContent.trim() },
    });
};

const censor = async (commentId, userRole) => {
    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
    });
    if (!comment) throw new Error("Comentario no encontrado");

    if (!["ADMIN", "COLLABORATOR"].includes(userRole)) {
        throw new Error("No tenés permisos para esto");
    }

    return await prisma.comment.update({
        where: { id: commentId },
        data: {
            content: "[Comentario censurado por moderación]",
            flagged: true,
        },
    });
};

const flag = async (commentId, userId, userRole) => {
    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
    });
    if (!comment) throw new Error("Comentario no encontrado");

    const isPrivileged = ["ADMIN", "COLLABORATOR"].includes(userRole);
    if (!isPrivileged) throw new Error("No tenés permisos para esto");

    const updated = await prisma.comment.update({
        where: { id: commentId },
        data: { flagged: true },
    });

    return updated;
};

module.exports = { create, remove, flag, edit, censor };
