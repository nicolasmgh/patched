const prisma = require("../utils/prisma");

const changeStatus = async (reportId, status, adminId, details = null) => {
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

    const updated = await prisma.report.update({
        where: { id: reportId },
        data,
    });

    // Log de la acción
    await prisma.actionLog.create({
        data: {
            action: "CHANGE_STATUS",
            details: details || `Estado cambiado a ${status}`,
            reportId,
            userId: adminId,
        },
    });

    // Reputación al dueño si se aprueba o resuelve
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
        await prisma.notification.create({
            data: {
                type: "REPORT_STATUS_CHANGED",
                message: `Tu reporte "${report.title}" cambió de estado a ${status}`,
                userId: report.userId,
            },
        });
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
    return prisma.reportSuggestion.update({
        where: { id: suggestionId },
        data: { status },
    });
};

const getPendingMedia = async () => {
    return prisma.media.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: {
            report: {
                select: {
                    id: true,
                    title: true,
                    user: { select: { firstName: true, lastName: true, email: true } },
                },
            },
            comment: {
                select: {
                    id: true,
                    content: true,
                    reportId: true,
                    user: { select: { firstName: true, lastName: true, email: true } },
                },
            },
        },
    });
};

const updateMediaStatus = async (mediaId, status) => {
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
    getSuggestions,
    updateSuggestionStatus,
    getPendingMedia,
    updateMediaStatus,
};
