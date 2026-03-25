const prisma = require("../utils/prisma");

const getProfile = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            reports: {
                orderBy: { createdAt: "desc" },
                take: 10,
                include: {
                    media: true,
                    _count: { select: { confirmations: true, comments: true } },
                },
            },
            badges: {
                include: { badge: true },
            },
            comments: {
                orderBy: { createdAt: "desc" },
                take: 20,
                include: {
                    report: {
                        select: { id: true, title: true },
                    },
                    _count: { select: { likes: true } },
                },
            },
            _count: {
                select: { reports: true, confirmations: true, comments: true },
            },
        },
    });

    if (!user) throw new Error("Usuario no encontrado");

    const { password, ...rest } = user;

    return rest;
};

const updateProfile = async (userId, data) => {
    const allowed = ["firstName", "lastName", "hideLastName", "avatarUrl", "username"];
    const filtered = Object.fromEntries(
        Object.entries(data).filter(([key]) => allowed.includes(key)),
    );

    // Si envían un username, asegurarnos de que sea alfanumérico y único
    if (filtered.username) {
        filtered.username = filtered.username.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
        const existing = await prisma.user.findUnique({
            where: { username: filtered.username }
        });
        if (existing && existing.id !== userId) {
            throw new Error("El nombre de usuario ya está en uso");
        }
    }

    const updated = await prisma.user.update({
        where: { id: userId },
        data: filtered,
    });

    const { password, ...rest } = updated;
    return rest;
};

const getNotifications = async (userId) => {
    return prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
    });
};

const markNotificationsRead = async (userId) => {
    await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
    });
    return { updated: true };
};

const getPublicProfile = async (identifier) => {
    const isId = identifier.length === 36;
    
    const user = await prisma.user.findFirst({
        where: isId ? { id: identifier } : { username: identifier },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            hideLastName: true,
            username: true,
            avatarUrl: true,
            reputation: true,
            createdAt: true,
            badges: { include: { badge: true } },
            reports: {
                where: { status: { not: "REJECTED" } },
                orderBy: { createdAt: "desc" },
                take: 10,
                select: {
                    id: true,
                    title: true,
                    category: true,
                    status: true,
                    createdAt: true,
                    address: true,
                    city: true,
                    _count: { select: { confirmations: true, comments: true } },
                },
            },
            _count: { select: { reports: true, confirmations: true } },
        },
    });

    if (!user) throw new Error("Usuario no encontrado");
    if (user.hideLastName) user.lastName = null;

    return user;
};

module.exports = {
    getProfile,
    updateProfile,
    getNotifications,
    markNotificationsRead,
    getPublicProfile,
};
