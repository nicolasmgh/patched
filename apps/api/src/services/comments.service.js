const prisma = require("../utils/prisma");

const create = async (reportId, userId, { content }) => {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error("Reporte no encontrado");
    if (!content?.trim()) throw new Error("El comentario no puede estar vacío");

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

    // Reputación al dueño del reporte
    if (report.userId && report.userId !== userId) {
        await prisma.user.update({
            where: { id: report.userId },
            data: { reputation: { increment: 1 } },
        });
    }

    if (comment.user.hideLastName) comment.user.lastName = null;

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

    await prisma.comment.delete({ where: { id: commentId } });

    return { deleted: true };
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

module.exports = { create, remove, flag };
