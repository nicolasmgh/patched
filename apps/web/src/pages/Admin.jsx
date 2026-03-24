import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Navbar from "../components/Navbar";

const STATUS_LABELS = {
    PENDING: "Pendiente",
    APPROVED: "Aprobado",
    IN_PROGRESS: "En progreso",
    RESOLVED: "Resuelto",
    REJECTED: "Rechazado",
    DUPLICATE: "Duplicado",
};

const STATUS_COLORS = {
    PENDING: "bg-amber-100 text-amber-800",
    APPROVED: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-purple-100 text-purple-800",
    RESOLVED: "bg-emerald-100 text-emerald-800",
    REJECTED: "bg-red-100 text-red-800",
    DUPLICATE: "bg-gray-100 text-gray-800",
};

const CATEGORY_LABELS = {
    POTHOLE: "Bache",
    SIDEWALK: "Vereda rota",
    STREET_LIGHTING: "Luminaria",
    ROAD_DAMAGE: "Daño en calzada",
    WASTE_MANAGEMENT: "Basura",
    STORM_DRAINAGE: "Desagüe",
    WATER_SANITATION: "Cloacas",
    POWER_GRID: "Corte de luz",
    TRAFFIC: "Tránsito",
    PUBLIC_SAFETY: "Seguridad",
    URBAN_PLANNING: "Obras",
    GREEN_SPACES: "Espacios verdes",
    OTHER: "Otro",
};

export default function Admin() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tab, setTab] = useState("dashboard");
    const [dashboard, setDashboard] = useState(null);
    const [reports, setReports] = useState([]);
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: "PENDING",
        category: "",
        city: "",
    });

    useEffect(() => {
        if (!user || !["ADMIN", "COLLABORATOR"].includes(user.role)) {
            navigate("/");
        }
    }, [user]);

    useEffect(() => {
        if (tab === "dashboard") fetchDashboard();
        if (tab === "reports") fetchReports();
        if (tab === "logs") fetchLogs();
        if (tab === "users" && user?.role === "ADMIN") fetchUsers();
    }, [tab, filters]);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const res = await api.get("/admin/dashboard");
            setDashboard(res.data);
        } finally {
            setLoading(false);
        }
    };

    const fetchReports = async () => {
        setLoading(true);
        try {
            const params = Object.fromEntries(
                Object.entries(filters).filter(([, v]) => v),
            );
            const res = await api.get("/reports", { params });
            setReports(res.data.reports);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get("/admin/logs");
            setLogs(res.data.logs);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get("/admin/users");
            setUsers(res.data.users);
        } finally {
            setLoading(false);
        }
    };

    const handleGrantCollaborator = async (userId, revoke = false) => {
        try {
            await api.patch(`/admin/users/${userId}/role`, {
                role: revoke ? "USER" : "COLLABORATOR",
            });
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.message || "Error");
        }
    };

    const tabs = [
        { key: "dashboard", label: "📊 Dashboard" },
        { key: "reports", label: "📋 Reportes" },
        { key: "logs", label: "📝 Logs" },
        ...(user?.role === "ADMIN"
            ? [{ key: "users", label: "👥 Usuarios" }]
            : []),
    ];

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />

            <div className="max-w-6xl mx-auto w-full px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Panel de administración
                    </h1>
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-medium">
                        {user?.role}
                    </span>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-6">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                                tab === t.key
                                    ? "bg-emerald-600 text-white"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Dashboard */}
                {tab === "dashboard" && dashboard && (
                    <div className="flex flex-col gap-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                {
                                    label: "Total reportes",
                                    value: dashboard.totals?.reports,
                                    color: "text-gray-900",
                                },
                                {
                                    label: "Pendientes",
                                    value: dashboard.totals?.pending,
                                    color: "text-amber-600",
                                },
                                {
                                    label: "Resueltos",
                                    value: dashboard.totals?.resolved,
                                    color: "text-emerald-600",
                                },
                                {
                                    label: "Usuarios",
                                    value: dashboard.totals?.users,
                                    color: "text-blue-600",
                                },
                            ].map((stat) => (
                                <div
                                    key={stat.label}
                                    className="bg-white rounded-2xl border border-gray-200 p-5"
                                >
                                    <p
                                        className={`text-3xl font-bold ${stat.color}`}
                                    >
                                        {stat.value}
                                    </p>
                                    <p className="text-sm text-gray-400 mt-1">
                                        {stat.label}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-2xl border border-gray-200 p-5">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                    Por categoría
                                </h3>
                                <div className="flex flex-col gap-2">
                                    {dashboard.byCategory?.map((c) => (
                                        <div
                                            key={c.category}
                                            className="flex items-center justify-between"
                                        >
                                            <span className="text-sm text-gray-600">
                                                {CATEGORY_LABELS[c.category]}
                                            </span>
                                            <span className="text-sm font-medium text-gray-900">
                                                {c._count.id}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-200 p-5">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                    Por ciudad
                                </h3>
                                <div className="flex flex-col gap-2">
                                    {dashboard.byCity?.map((c) => (
                                        <div
                                            key={c.city}
                                            className="flex items-center justify-between"
                                        >
                                            <span className="text-sm text-gray-600">
                                                {c.city || "Sin ciudad"}
                                            </span>
                                            <span className="text-sm font-medium text-gray-900">
                                                {c._count.id}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 p-5">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                Estados
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {[
                                    {
                                        label: "Aprobados",
                                        value: dashboard.totals?.approved,
                                        color: "bg-blue-50 text-blue-700",
                                    },
                                    {
                                        label: "En progreso",
                                        value: dashboard.totals?.inProgress,
                                        color: "bg-purple-50 text-purple-700",
                                    },
                                    {
                                        label: "Rechazados",
                                        value: dashboard.totals?.rejected,
                                        color: "bg-red-50 text-red-700",
                                    },
                                ].map((s) => (
                                    <div
                                        key={s.label}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium ${s.color}`}
                                    >
                                        {s.label}: {s.value}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Reportes */}
                {tab === "reports" && (
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-2 flex-wrap">
                            <select
                                value={filters.status}
                                onChange={(e) =>
                                    setFilters((f) => ({
                                        ...f,
                                        status: e.target.value,
                                    }))
                                }
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="">Todos los estados</option>
                                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>
                                        {v}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={filters.category}
                                onChange={(e) =>
                                    setFilters((f) => ({
                                        ...f,
                                        category: e.target.value,
                                    }))
                                }
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="">Todas las categorías</option>
                                {Object.entries(CATEGORY_LABELS).map(
                                    ([k, v]) => (
                                        <option key={k} value={k}>
                                            {v}
                                        </option>
                                    ),
                                )}
                            </select>

                            <input
                                type="text"
                                placeholder="Ciudad..."
                                value={filters.city}
                                onChange={(e) =>
                                    setFilters((f) => ({
                                        ...f,
                                        city: e.target.value,
                                    }))
                                }
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        {loading ? (
                            <div className="text-center text-gray-400 py-8">
                                Cargando...
                            </div>
                        ) : reports.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                                <p className="text-gray-400 text-sm">
                                    No hay reportes con estos filtros
                                </p>
                            </div>
                        ) : (
                            reports.map((r) => (
                                <div
                                    key={r.id}
                                    className="bg-white rounded-2xl border border-gray-200 p-4 flex items-start justify-between gap-4"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status]}`}
                                            >
                                                {STATUS_LABELS[r.status]}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {CATEGORY_LABELS[r.category]}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800">
                                            {r.title}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {r.address || r.city} ·{" "}
                                            {new Date(
                                                r.createdAt,
                                            ).toLocaleDateString("es-AR")}
                                        </p>
                                        <div className="flex gap-3 mt-1 text-xs text-gray-400">
                                            <span>
                                                ✓ {r._count?.confirmations}
                                            </span>
                                            <span>💬 {r._count?.comments}</span>
                                        </div>
                                    </div>
                                    <Link
                                        to={`/admin/reports/${r.id}`}
                                        className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700 transition shrink-0"
                                    >
                                        Gestionar
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Logs */}
                {tab === "logs" && (
                    <div className="flex flex-col gap-2">
                        {loading ? (
                            <div className="text-center text-gray-400 py-8">
                                Cargando...
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                                <p className="text-gray-400 text-sm">
                                    Sin acciones registradas
                                </p>
                            </div>
                        ) : (
                            logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="bg-white rounded-xl border border-gray-200 px-4 py-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                                                {log.action}
                                            </span>
                                            <span className="text-xs text-gray-500 ml-2">
                                                por {log.user?.firstName}{" "}
                                                {log.user?.lastName}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {new Date(
                                                log.createdAt,
                                            ).toLocaleDateString("es-AR")}
                                        </span>
                                    </div>
                                    {log.details && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {log.details}
                                        </p>
                                    )}
                                    {log.report && (
                                        <Link
                                            to={`/reports/${log.report.id}`}
                                            className="text-xs text-emerald-600 hover:underline mt-0.5 block"
                                        >
                                            {log.report.title}
                                        </Link>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Usuarios — solo ADMIN */}
                {tab === "users" && user?.role === "ADMIN" && (
                    <div className="flex flex-col gap-3">
                        {loading ? (
                            <div className="text-center text-gray-400 py-8">
                                Cargando...
                            </div>
                        ) : (
                            users.map((u) => (
                                <div
                                    key={u.id}
                                    className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between gap-4"
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">
                                            {u.firstName} {u.lastName}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {u.email}
                                        </p>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                {u.role}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                ⭐ {u.reputation} pts
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                📋 {u._count?.reports} reportes
                                            </span>
                                        </div>
                                    </div>
                                    {u.id !== user.id && u.role !== "ADMIN" && (
                                        <button
                                            onClick={() =>
                                                handleGrantCollaborator(
                                                    u.id,
                                                    u.role === "COLLABORATOR",
                                                )
                                            }
                                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition shrink-0 ${
                                                u.role === "COLLABORATOR"
                                                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                                                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                            }`}
                                        >
                                            {u.role === "COLLABORATOR"
                                                ? "Quitar colaborador"
                                                : "Hacer colaborador"}
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
