const prisma = require("../utils/prisma");
const path = require("path");
const fs = require("fs");

const attachToReport = async (
    reportId,
    files,
    { isBefore = false, isAfter = false } = {},
) => {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error("Reporte no encontrado");

    const media = await Promise.all(
        files.map((file) => {
            const url = `/uploads/${file.filename}`;
            return prisma.media.create({
                data: {
                    url,
                    type: file.mimetype.startsWith("video") ? "VIDEO" : "PHOTO",
                    isBefore,
                    isAfter,
                    reportId,
                },
            });
        }),
    );

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

    // Borrar archivo físico
    const filePath = path.join(
        __dirname,
        "../../uploads",
        path.basename(media.url),
    );
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.media.delete({ where: { id: mediaId } });

    return { deleted: true };
};

module.exports = { attachToReport, deleteMedia };
