const { getIO } = require("../utils/socket");
const fs = require("fs");
const path = require("path");
const prisma = require("../utils/prisma");

const changeStatus = async (
    reportId,
    status,
    adminId,
    details = null,
    duplicateId = null,
) => {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error("Reporte no encontrado");

    const validTransitions = {
        PENDING: ["APPROVED", "REJECTED", "DUPLICATE"],
        APPROVED: ["IN_PROGRESS", "REJECTED"],
        IN_PROGRESS: ["RESOLVED", "REJECTED"],
        RESOLVED: [],
        REJECTED: ["PENDING"],
        DUPLICATE: ["PENDING"],
    };

    if (!validTransitions[report.status].includes(status)) {
        throw new Error(`No se puede cambiar de ${report.status} a ${status}`);
    }

    // Reporte resuelto requiere al menos una foto isAfter
    if (status === "RESOLVED") {
        const afterPhoto = await prisma.media.findFirst({
            where: { reportId, isAfter: true },
        });
        if (!afterPhoto)
            throw new Error(
                "Para resolver un reporte necesitás subir al menos una foto del después",
            );
    }

    const data = { status };
    if (status === "RESOLVED") data.resolvedAt = new Date();

    if (status === "DUPLICATE") {
        if (!duplicateId)
            throw new Error("Debes ingresar el ID del reporte original.");
        const originalReport = await prisma.report.findUnique({
            where: { id: duplicateId },
        });
        if (!originalReport) {
            throw new Error("El reporte original indicado no existe.");
        }
        data.duplicateId = duplicateId;

        // Transfer images to original report
        await prisma.media.updateMany({
            where: { reportId },
            data: { reportId: duplicateId },
        });
    } else if (status === "PENDING" && report.status === "DUPLICATE") {
        data.duplicateId = null;
    }

    const updated = await prisma.report.update({
        where: { id: reportId },
        data,
    });

    if (status === "REJECTED") {
        const mediasToReject = await prisma.media.findMany({
            where: { reportId },
        });

        for (const m of mediasToReject) {
            try {
                const filePath = path.join(__dirname, "../../", m.url);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (err) {
                console.error("Error al eliminar archivo físico:", err);
            }
        }
        await prisma.media.deleteMany({ where: { reportId } });
    }

    // Log de la acción
    await prisma.actionLog.create({
        data: {
            action: "CHANGE_STATUS",
            details: details || `Estado cambiado a ${status}`,
            reportId,
            userId: adminId,
        },
    });

    if (status === "APPROVED") {
        await prisma.media.updateMany({
            where: { reportId, status: "PENDING" },
            data: { status: "APPROVED" },
        });
    }

    if (report.userId) {
        if (status === "APPROVED") {
            await prisma.user.update({
                where: { id: report.userId },
                data: { reputation: { increment: 10 } },
            });
        }
        if (status === "RESOLVED") {
            await prisma.user.update({
                where: { id: report.userId },
                data: { reputation: { increment: 15 } },
            });
        }
        if (status === "REJECTED") {
            await prisma.user.update({
                where: { id: report.userId },
                data: { reputation: { decrement: 5 } },
            });
        }
    }

    // Notificar al dueño del reporte
    if (report.userId) {
        console.log(
            `[Admin Service] Creando notificación para el userId: ${report.userId}`,
        );
        let message = `Tu reporte "${report.title}" cambió de estado a ${status}.`;
        if (status === "REJECTED" && details) {
            message += ` Motivo: ${details}`;
        } else if (status === "DUPLICATE" && duplicateId) {
            message += ` Motivo: Ya existía otro reporte igual creado (ID: ${duplicateId}). Las fotos fueron movidas a ese reporte.`;
        }

        const notif = await prisma.notification.create({
            data: {
                type: "REPORT_STATUS_CHANGED",
                message,
                userId: report.userId,
                data: {
                    ...(status !== "REJECTED" && { reportId }),
                    status,
                },
            },
        });

        const { emitNotification } = require("../utils/socket");
        emitNotification(notif);
    }

    try {
        console.log(
            "Emitiendo evento reportUpdate para el reporte:",
            updated.id,
        );
        getIO().emit("reportUpdate", updated);
    } catch (e) {
        console.error("Error al emitir reportUpdate:", e.message);
    }

    return updated;
};

const modifyReport = async (reportId, data, adminId) => {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error("Reporte no encontrado");

    const allowed = [
        "title",
        "description",
        "category",
        "urgency",
        "address",
        "city",
        "province",
        "latitude",
        "longitude",
    ];
    const filtered = Object.fromEntries(
        Object.entries(data).filter(([key]) => allowed.includes(key)),
    );

    const updated = await prisma.report.update({
        where: { id: reportId },
        data: filtered,
    });

    await prisma.actionLog.create({
        data: {
            action: "MODIFY_REPORT",
            details: `Campos modificados: ${Object.keys(filtered).join(", ")}`,
            reportId,
            userId: adminId,
        },
    });

    try {
        console.log(
            "Emitiendo evento reportUpdate para reporte modificado:",
            updated.id,
        );
        getIO().emit("reportUpdate", updated);
    } catch (e) {
        console.error("Error al emitir reportUpdate:", e.message);
    }

    return updated;
};

const getActionLogs = async (filters = {}) => {
    const { reportId, userId } = filters;

    const where = {};
    if (reportId) where.reportId = reportId;
    if (userId) where.userId = userId;

    return prisma.actionLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                },
            },
            report: {
                select: { id: true, title: true },
            },
        },
    });
};

const getDashboard = async () => {
    const [
        totalReports,
        pendingReports,
        approvedReports,
        inProgressReports,
        resolvedReports,
        rejectedReports,
        totalUsers,
    ] = await Promise.all([
        prisma.report.count(),
        prisma.report.count({ where: { status: "PENDING" } }),
        prisma.report.count({ where: { status: "APPROVED" } }),
        prisma.report.count({ where: { status: "IN_PROGRESS" } }),
        prisma.report.count({ where: { status: "RESOLVED" } }),
        prisma.report.count({ where: { status: "REJECTED" } }),
        prisma.user.count(),
    ]);

    const byCategory = await prisma.report.groupBy({
        by: ["category"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
    });

    const byCity = await prisma.report.groupBy({
        by: ["city"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
    });

    return {
        totals: {
            reports: totalReports,
            pending: pendingReports,
            approved: approvedReports,
            inProgress: inProgressReports,
            resolved: resolvedReports,
            rejected: rejectedReports,
            users: totalUsers,
        },
        byCategory,
        byCity,
    };
};

const getUsers = async () => {
    return prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            reputation: true,
            warnings: true,
            active: true,
            createdAt: true,
            _count: { select: { reports: true } },
        },
    });
};

const updateUserRole = async (userId, role, adminId) => {
    const validRoles = ["USER", "COLLABORATOR"];
    if (!validRoles.includes(role)) throw new Error("Rol inválido");

    const updated = await prisma.user.update({
        where: { id: userId },
        data: { role },
    });

    await prisma.actionLog.create({
        data: {
            action:
                role === "COLLABORATOR"
                    ? "GRANT_COLLABORATOR"
                    : "REVOKE_COLLABORATOR",
            details: `Rol cambiado a ${role}`,
            userId: adminId,
        },
    });

    return updated;
};

const toggleUserStatus = async (userId, active, adminId) => {
    const updated = await prisma.user.update({
        where: { id: userId },
        data: { active },
    });

    const notif = await prisma.notification.create({
        data: {
            userId: userId,
            type: active ? "USER_UNBANNED" : "USER_BANNED",
            message: active
                ? "Tu cuenta ha sido reactivada."
                : "Tu cuenta ha sido suspendida por incumplir las normas.",
        },
    });

    const { emitNotification } = require("../utils/socket");
    emitNotification(notif);

    if (active) {
        // Al desbanear un usuario, se completan (o cancelan) sus apelaciones anteriores
        // pasándolas a APPLIED para que pueda volver a apelar en el futuro si es baneado de nuevo.
        await prisma.reportSuggestion.updateMany({
            where: {
                userId: userId,
                reason: "BAN_APPEAL",
            },
            data: {
                status: "APPLIED",
            },
        });
    }

    return updated;
};

const getSuggestions = async (status) => {
    const where = {};
    if (status) {
        where.status = status;
    }
    return prisma.reportSuggestion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                },
            },
            report: {
                select: {
                    id: true,
                    title: true,
                },
            },
        },
    });
};

const updateSuggestionStatus = async (suggestionId, status) => {
    const suggestion = await prisma.reportSuggestion.findUnique({
        where: { id: suggestionId },
    });

    if (!suggestion) throw new Error("Sugerencia no encontrada");

    const updated = await prisma.reportSuggestion.update({
        where: { id: suggestionId },
        data: { status },
    });

    // Si es una apelación de baneo y se aprueba, desbaneamos al usuario automáticamente
    if (suggestion.reason === "BAN_APPEAL" && status === "APPLIED") {
        await prisma.user.update({
            where: { id: suggestion.userId },
            data: { active: true },
        });

        // Limpiamos otras posibles apelaciones pendientes marcándolas como aplicadas
        await prisma.reportSuggestion.updateMany({
            where: {
                userId: suggestion.userId,
                reason: "BAN_APPEAL",
                status: "PENDING",
            },
            data: { status: "APPLIED" },
        });
    }

    return updated;
};

const getPendingMedia = async () => {
    return prisma.media.findMany({
        where: {
            status: "PENDING",
            OR: [
                {
                    reportId: { not: null },
                    report: {
                        status: { notIn: ["PENDING", "REJECTED", "DUPLICATE"] },
                    },
                },
                {
                    commentId: { not: null },
                    comment: {
                        report: {
                            status: {
                                notIn: ["PENDING", "REJECTED", "DUPLICATE"],
                            },
                        },
                    },
                },
            ],
        },
        orderBy: { createdAt: "desc" },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                },
            },
            report: {
                select: {
                    id: true,
                    title: true,
                    userId: true,
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            },
            comment: {
                select: {
                    id: true,
                    content: true,
                    reportId: true,
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            },
        },
    });
};

const updateMediaStatus = async (mediaId, status, warnUser = false) => {
    const media = await prisma.media.findUnique({
        where: { id: mediaId },
        include: {
            user: true,
            report: true,
            comment: {
                include: { report: true },
            },
        },
    });

    if (!media) {
        const err = new Error("Media no encontrada");
        err.statusCode = 404;
        throw err;
    }

    if (status === "APPROVED") {
        const hasReport = media.report || media.comment?.report;
        if (!hasReport) {
            const err = new Error(
                "El reporte asociado a esta imagen ya no existe",
            );
            err.statusCode = 404;
            throw err;
        }
    }

    // Determinar el dueño del medio, el dueño del reporte y el título del reporte
    const uploaderId = media.userId;
    const reportOwnerId = media.report?.userId || media.comment?.report?.userId;
    const reportTitle =
        media.report?.title || media.comment?.report?.title || "desconocido";
    const reportId = media.reportId || media.comment?.reportId;

    if (warnUser && uploaderId) {
        const user = await prisma.user.update({
            where: { id: uploaderId },
            data: { warnings: { increment: 1 } },
        });

        const notif = await prisma.notification.create({
            data: {
                userId: uploaderId,
                type: "USER_WARNED",
                message:
                    "Has sido advertido por subir contenido inapropiado. Acumular advertencias puede resultar en la suspensión de tu cuenta.",
                data: reportId ? { reportId } : null,
            },
        });
        const { emitNotification } = require("../utils/socket");
        emitNotification(notif);
    }

    if (status === "REJECTED") {
        if (uploaderId) {
            const notif = await prisma.notification.create({
                data: {
                    userId: uploaderId,
                    type: "MEDIA_REJECTED",
                    message: `Una imagen o video que subiste en el reporte "${reportTitle}" fue rechazado y eliminado por no cumplir con nuestras normas.`,
                    data: reportId ? { reportId } : null,
                },
            });
            const { emitNotification } = require("../utils/socket");
            emitNotification(notif);
        }

        // Eliminar también el archivo físico del servidor
        try {
            // media.url típicamente es algo como "/uploads/..."
            // Buscamos la ruta absoluta
            const filePath = path.join(__dirname, "../../", media.url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (err) {
            console.error("Error al eliminar archivo físico:", err);
        }

        // Eliminar de la base de datos para no listarlo más
        return prisma.media.delete({
            where: { id: mediaId },
        });
    }

    if (status === "APPROVED") {
        if (uploaderId) {
            let increment = 0;
            if (media.type === "PHOTO") {
                increment = media.commentId ? 6 : 5;
            } else if (media.type === "VIDEO") {
                increment = 10;
            }

            if (increment > 0) {
                await prisma.user.update({
                    where: { id: uploaderId },
                    data: { reputation: { increment } },
                });
            }

            const notif = await prisma.notification.create({
                data: {
                    userId: uploaderId,
                    type: "MEDIA_ACCEPTED",
                    message: `¡Tu archivo multimedia en el reporte "${reportTitle}" ha sido aprobado y ahora es visible!`,
                    data: reportId ? { reportId } : null,
                },
            });
            const { emitNotification } = require("../utils/socket");
            emitNotification(notif);
        }

        // Notificar al dueño del reporte que alguien más subió una foto a su reporte
        if (reportOwnerId && reportOwnerId !== uploaderId) {
            const uploaderName = media.user?.firstName || "Alguien";
            const notif = await prisma.notification.create({
                data: {
                    userId: reportOwnerId,
                    type: "COMMENT_ON_REPORT", // or a new type if preferred, but this works well for generic "someone interacted"
                    message: `${uploaderName} ha subido una foto a tu reporte "${reportTitle}".`,
                    data: reportId ? { reportId } : null,
                },
            });
            const { emitNotification } = require("../utils/socket");
            emitNotification(notif);
        }
    }

    return prisma.media.update({
        where: { id: mediaId },
        data: { status },
    });
};

module.exports = {
    changeStatus,
    modifyReport,
    getActionLogs,
    getDashboard,
    getUsers,
    updateUserRole,
    toggleUserStatus,
    getSuggestions,
    updateSuggestionStatus,
    getPendingMedia,
    updateMediaStatus,
};
