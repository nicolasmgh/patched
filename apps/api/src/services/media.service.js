const prisma = require("../utils/prisma");
const path = require("path");
const fs = require("fs");

const attachToReport = async (
    reportId,
    files,
    userId,
    { isBefore = false, isAfter = false } = {},
) => {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error("Reporte no encontrado");

    const media = await Promise.all(
        files.map((file) => {
            // file.path ahora contiene la URL gratuita en la nube de Cloudinary en lugar de una ruta local
            const url = file.path; 
            return prisma.media.create({
                data: {
                    url,
                    type: file.mimetype.startsWith("video") ? "VIDEO" : "PHOTO",
                    isBefore,
                    isAfter,
                    reportId,
                    userId,
                },
            });
        }),
    );

    try {
        const admins = await prisma.user.findMany({
            where: { role: { in: ["ADMIN", "COLLABORATOR"] }, active: true },
            select: { id: true },
        });

        if (admins.length > 0) {
            const notifData = admins.map((admin) => ({
                userId: admin.id,
                type: "REPORT_STATUS_CHANGED",
                message: `Nueva imagen pendiente de moderación para el reporte "${report.title}".`,
                data: { reportId: report.id, status: "PENDING" },
            }));
            await prisma.notification.createMany({ data: notifData });

            const createdNotifs = await prisma.notification.findMany({
                where: {
                    type: "REPORT_STATUS_CHANGED",
                    data: { path: ["reportId"], equals: report.id },
                },
                orderBy: { createdAt: "desc" },
                take: admins.length,
            });

            const { emitNotification } = require("../utils/socket");
            createdNotifs.forEach((n) => emitNotification(n));
        }
    } catch (err) {
        console.error(
            "Error enviando notificaciones a admins para nueva media:",
            err,
        );
    }

    return media;
};

const attachToComment = async (commentId, files, userId) => {
    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: { report: true },
    });
    if (!comment) throw new Error("Comentario no encontrado");

    const media = await Promise.all(
        files.map((file) => {
            const url = file.path;
            return prisma.media.create({
                data: {
                    url,
                    type: file.mimetype.startsWith("video") ? "VIDEO" : "PHOTO",
                    commentId,
                    userId,
                },
            });
        }),
    );

    try {
        const admins = await prisma.user.findMany({
            where: { role: { in: ["ADMIN", "COLLABORATOR"] }, active: true },
            select: { id: true },
        });

        if (admins.length > 0 && comment.report) {
            const notifData = admins.map((admin) => ({
                userId: admin.id,
                type: "REPORT_STATUS_CHANGED",
                message: `Nueva imagen pendiente de moderación en un comentario del reporte "${comment.report.title}".`,
                data: { reportId: comment.report.id, status: "PENDING" },
            }));
            await prisma.notification.createMany({ data: notifData });

            const { emitNotification } = require("../utils/socket");
            const notifs = await prisma.notification.findMany({
                where: {
                    type: "REPORT_STATUS_CHANGED",
                    userId: { in: admins.map((a) => a.id) },
                },
                orderBy: { createdAt: "desc" },
                take: admins.length,
            });
            notifs.forEach((n) => emitNotification(n));
        }
    } catch (err) {
        console.error(
            "Error enviando notificaciones a admins para nueva media (comentario):",
            err,
        );
    }

    return media;
};

const deleteMedia = async (mediaId, userId, userRole) => {
    const media = await prisma.media.findUnique({
        where: { id: mediaId },
        include: { report: true },
    });

    if (!media) throw new Error("Media no encontrada");

    // Solo el dueño del reporte o admin/colaborador puede borrar
    const isOwner = media.report.userId === userId;
    const isPrivileged = ["ADMIN", "COLLABORATOR"].includes(userRole);

    if (!isOwner && !isPrivileged) {
        throw new Error("No tenés permisos para eliminar esta media");
    }

    // Opcional: Para Cloudinary, si quisiéramos borrar el archivo físico usaríamos 
    // su API: cloudinary.uploader.destroy(public_id). Pero podemos dejar solo el borrado lógico en db como alternativa segura.

    await prisma.media.delete({ where: { id: mediaId } });

    return { deleted: true };
};

module.exports = { attachToReport, attachToComment, deleteMedia };
