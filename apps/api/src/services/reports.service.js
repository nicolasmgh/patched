const prisma = require("../utils/prisma");

const create = async (data, userId) => {
    const {
        title,
        description,
        category,
        urgency,
        latitude,
        longitude,
        address,
        city,
        province,
        country,
    } = data;

    const report = await prisma.report.create({
        data: {
            title,
            description,
            category,
            urgency: urgency || "LOW",
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            address,
            city,
            province,
            country: country || "AR",
            userId: userId || null,
        },
    });

    try {
        const admins = await prisma.user.findMany({
            where: { role: { in: ["ADMIN", "COLLABORATOR"] }, active: true },
            select: { id: true },
        });

        if (admins.length > 0) {
            const notifData = admins.map((admin) => ({
                userId: admin.id,
                type: "REPORT_STATUS_CHANGED",
                message: `Nuevo reporte pendiente de aprobación: "${report.title}" en ${report.city || report.address || "tu zona"}.`,
                data: { reportId: report.id, status: "PENDING" },
            }));

            await prisma.notification.createMany({ data: notifData });

            const createdNotifs = await prisma.notification.findMany({
                where: {
                    type: "REPORT_STATUS_CHANGED",
                    data: { path: ["reportId"], equals: report.id },
                }
            });

            const { emitNotification } = require("../utils/socket");
            createdNotifs.forEach((n) => emitNotification(n));
        }
    } catch (err) {
        console.error("Error enviando notificaciones a admins para nuevo reporte:", err);
    }

    return report;
};

const getAll = async (filters = {}, user = null) => {
    const { category, status, city, province, from, to } = filters;
    const isMod = user && ["COLLABORATOR", "ADMIN"].includes(user.role);

    const where = {};
    
    // Filtros por defecto si no es moderador (solo ver reportes pÃºblicos o propios)
    if (!isMod) {
        if (user) {
            where.OR = [
                { status: { in: ["APPROVED", "IN_PROGRESS", "RESOLVED"] } },
                { userId: user.id }
            ];
        } else {
            where.status = { in: ["APPROVED", "IN_PROGRESS", "RESOLVED"] };
        }
    }

    if (category) where.category = category;
    
    // Si viene status en query, intersectar
    if (status) {
        const statuses = status.includes(",") ? status.split(",") : [status];
        if (!isMod && !user) {
            // Un invitado solo puede filtrar por aceptados
            where.status = { in: statuses.filter(s => ["APPROVED", "IN_PROGRESS", "RESOLVED"].includes(s)) };
        } else if (!isMod && user) {
            // Usuario normal: si filtra por un status prohibido, solo le mostramos los suyos
            const allowedStatuses = statuses.filter(s => ["APPROVED", "IN_PROGRESS", "RESOLVED"].includes(s));
            if (allowedStatuses.length > 0) {
                 where.OR = [
                     { status: { in: allowedStatuses } },
                     { userId: user.id, status: { in: statuses } }
                 ];
            } else {
                 where.userId = user.id;
                 where.status = { in: statuses };
                 delete where.OR; // Sobrescribir el OR pÃºblico
            }
        } else {
            // Moderador
            where.status = { in: statuses };
        }
    }

    if (city) where.city = { contains: city, mode: "insensitive" };
    if (province) where.province = { contains: province, mode: "insensitive" };
    if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
    }

    const reports = await prisma.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
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
            media: {
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            hideLastName: true,
                            avatarUrl: true,
                        },
                    },
                },
            },
            _count: {
                select: {
                    confirmations: true,
                    comments: true,
                },
            },
        },
    });

    return reports.map(sanitizeUser);
};

const getById = async (id, user = null) => {
    const report = await prisma.report.findUnique({
        where: { id },
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
            media: {
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            hideLastName: true,
                            avatarUrl: true,
                        },
                    },
                },
            },
            comments: {
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            hideLastName: true,
                            avatarUrl: true,
                        },
                    },
                    media: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    firstName: true,
                                    lastName: true,
                                    hideLastName: true,
                                    avatarUrl: true,
                                },
                            },
                        },
                    },
                    votes: {
                        select: { userId: true, value: true },
                    },
                    _count: { select: { votes: true } },
                },
                orderBy: { createdAt: "asc" },
            },
            confirmations: {
                select: { userId: true, createdAt: true },
            },
            follows: {
                select: { userId: true },
            },
            _count: {
                select: {
                    confirmations: true,
                    comments: true,
                    follows: true,
                },
            },
        },
    });

    if (!report) throw new Error("Reporte no encontrado");

    // Validar visibilidad si no es moderador ni el creador
    const isOwner = user && report.userId === user.id;
    const isMod = user && ["COLLABORATOR", "ADMIN"].includes(user.role);
    
    if (!isOwner && !isMod) {
        if (["PENDING", "REJECTED", "DUPLICATE"].includes(report.status)) {
            const err = new Error("Reporte no disponible");
            err.statusCode = 403;
            throw err;
        }
    }

    return sanitizeUser(report);
};

const createSuggestion = async (reportId, userId, data) => {
    const { reason, message } = data;

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error("Reporte no encontrado");

    const suggestion = await prisma.reportSuggestion.create({
        data: {
            reason,
            message,
            reportId,
            userId,
        },
    });

    return suggestion;
};

// Ocultar apellido si hideLastName es true
const sanitizeUser = (report) => {
    if (report.user?.hideLastName) {
        report.user.lastName = null;
    }
    return report;
};

module.exports = { create, getAll, getById, createSuggestion };
