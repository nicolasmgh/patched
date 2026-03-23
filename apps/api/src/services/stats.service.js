const prisma = require("../utils/prisma");

const getPublicStats = async () => {
    const [total, resolved, pending, byCategory, byStatus] = await Promise.all([
        prisma.report.count(),
        prisma.report.count({ where: { status: "RESOLVED" } }),
        prisma.report.count({ where: { status: "PENDING" } }),
        prisma.report.groupBy({
            by: ["category"],
            _count: { id: true },
            orderBy: { _count: { id: "desc" } },
        }),
        prisma.report.groupBy({
            by: ["status"],
            _count: { id: true },
        }),
    ]);

    return { total, resolved, pending, byCategory, byStatus };
};

const getRankingByCity = async () => {
    const cities = await prisma.report.groupBy({
        by: ["city", "province"],
        where: { city: { not: null }, status: { not: "RESOLVED" } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 20,
    });

    return cities.map((c) => ({
        city: c.city,
        province: c.province,
        openReports: c._count.id,
    }));
};

const getAbandonmentIndex = async () => {
    // Promedio de días sin resolver por ciudad
    const reports = await prisma.report.findMany({
        where: {
            status: { notIn: ["RESOLVED", "REJECTED", "DUPLICATE"] },
            city: { not: null },
        },
        select: { city: true, province: true, createdAt: true, status: true },
    });

    const cityMap = {};
    const now = new Date();

    for (const r of reports) {
        const key = r.city;
        if (!cityMap[key])
            cityMap[key] = {
                city: r.city,
                province: r.province,
                days: [],
                count: 0,
            };
        const days = Math.floor(
            (now - new Date(r.createdAt)) / (1000 * 60 * 60 * 24),
        );
        cityMap[key].days.push(days);
        cityMap[key].count++;
    }

    return Object.values(cityMap)
        .map((c) => ({
            city: c.city,
            province: c.province,
            openReports: c.count,
            avgDaysOpen: Math.round(
                c.days.reduce((a, b) => a + b, 0) / c.days.length,
            ),
        }))
        .sort((a, b) => b.avgDaysOpen - a.avgDaysOpen);
};

const getAvgResolutionTime = async () => {
    const resolved = await prisma.report.findMany({
        where: {
            status: "RESOLVED",
            resolvedAt: { not: null },
        },
        select: {
            category: true,
            createdAt: true,
            resolvedAt: true,
            city: true,
        },
    });

    const byCategory = {};
    for (const r of resolved) {
        const days = Math.floor(
            (new Date(r.resolvedAt) - new Date(r.createdAt)) /
                (1000 * 60 * 60 * 24),
        );
        if (!byCategory[r.category]) byCategory[r.category] = [];
        byCategory[r.category].push(days);
    }

    return Object.entries(byCategory).map(([category, days]) => ({
        category,
        avgDays: Math.round(days.reduce((a, b) => a + b, 0) / days.length),
        totalResolved: days.length,
    }));
};

const getHeatmapData = async () => {
    const reports = await prisma.report.findMany({
        where: { status: { notIn: ["REJECTED", "DUPLICATE"] } },
        select: {
            latitude: true,
            longitude: true,
            status: true,
            category: true,
        },
    });

    return reports;
};

module.exports = {
    getPublicStats,
    getRankingByCity,
    getAbandonmentIndex,
    getAvgResolutionTime,
    getHeatmapData,
};
