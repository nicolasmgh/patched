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
                    votes: { select: { value: true, userId: true } },
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
    const allowed = [
        "firstName",
        "lastName",
        "hideLastName",
        "avatarUrl",
        "username",
    ];
    const filtered = Object.fromEntries(
        Object.entries(data).filter(([key]) => allowed.includes(key)),
    );

    // Si envÃ­an un username, asegurarnos de que sea alfanumÃ©rico y Ãºnico
    if (filtered.username) {
        filtered.username = filtered.username
            .replace(/[^a-zA-Z0-9_]/g, "")
            .toLowerCase();
        const existing = await prisma.user.findUnique({
            where: { username: filtered.username },
        });
        if (existing && existing.id !== userId) {
            throw new Error("El nombre de usuario ya estÃ¡ en uso");
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

    try {
        const { getIO } = require("../utils/socket");
        getIO().emit("notificationsRead", { userId });
    } catch (e) {
        console.error("Socket emit notificationsRead error:", e.message);
    }

    return { updated: true };
};

const getPublicProfile = async (identifier, requestingUser) => {
    const isId = identifier.length === 36;

    // Primero verificamos si es admin o el dueÃ±o para ver los pendientes
    let statusFilter = { not: "REJECTED" };
    
    // Para saber si es el dueÃ±o necesitamos el ID real
    let targetUserId = identifier;
    if (!isId) {
        const u = await prisma.user.findUnique({ where: { username: identifier }, select: { id: true } });
        if (u) targetUserId = u.id;
    }

    const isAdmin = requestingUser && ["ADMIN", "COLLABORATOR"].includes(requestingUser.role);
    const isOwner = requestingUser && requestingUser.id === targetUserId;

    if (!isAdmin && !isOwner) {
        // Personas normales o sin login solo ven reportes aceptados/activos/resueltos
        statusFilter = { in: ["APPROVED", "IN_PROGRESS", "RESOLVED"] };
    }

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
                where: { status: statusFilter },
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

const searchUsers = async (query) => {
    if (!query || query.length < 1) return [];

    return prisma.user.findMany({
        where: {
            OR: [
                { username: { contains: query, mode: "insensitive" } },
                { firstName: { contains: query, mode: "insensitive" } },
            ],
        },
        select: {
            id: true,
            username: true,
            firstName: true,
            avatarUrl: true,
        },
        take: 5,
    });
};

module.exports = {
    getProfile,
    updateProfile,
    getNotifications,
    markNotificationsRead,
    getPublicProfile,
    searchUsers,
};
