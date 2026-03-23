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

    return report;
};

const getAll = async (filters = {}) => {
    const { category, status, city, province, from, to } = filters;

    const where = {};
    if (category) where.category = category;
    if (status) where.status = status;
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
            media: true,
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

const getById = async (id) => {
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
            media: true,
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
                    media: true,
                },
                orderBy: { createdAt: "asc" },
            },
            confirmations: {
                select: { userId: true, createdAt: true },
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

    return sanitizeUser(report);
};

// Ocultar apellido si hideLastName es true
const sanitizeUser = (report) => {
    if (report.user?.hideLastName) {
        report.user.lastName = null;
    }
    return report;
};

module.exports = { create, getAll, getById };
