import { useState, useEffect, useMemo } from "react";
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
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [tab, setTab] = useState("dashboard");
    const [dashboard, setDashboard] = useState(null);
    const [reports, setReports] = useState([]);
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [pendingMedia, setPendingMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: "PENDING",
        category: "",
        city: "",
    });
    const [userRoleFilter, setUserRoleFilter] = useState("");
    const [userSort, setUserSort] = useState("recent");

    const filteredAndSortedUsers = useMemo(() => {
        let result = [...users];

        if (userRoleFilter) {
            result = result.filter((u) => u.role === userRoleFilter);
        }

        result.sort((a, b) => {
            switch (userSort) {
                case "name_asc":
                    return a.firstName.localeCompare(b.firstName);
                case "reputation_desc":
                    return (b.reputation || 0) - (a.reputation || 0);
                case "reports_desc":
                    return (b._count?.reports || 0) - (a._count?.reports || 0);
                case "warnings_desc":
                    return (b.warnings || 0) - (a.warnings || 0);
                case "recent":
                default:
                    return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });

        return result;
    }, [users, userRoleFilter, userSort]);

    useEffect(() => {
        if (
            !authLoading &&
            (!user || !["ADMIN", "COLLABORATOR"].includes(user.role))
        ) {
            navigate("/");
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (tab === "dashboard") fetchDashboard();
        if (tab === "reports") fetchReports();
        if (tab === "logs") fetchLogs();
        if (tab === "suggestions") fetchSuggestions();
        if (tab === "moderation") fetchPendingMedia();
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

    const fetchSuggestions = async () => {
        setLoading(true);
        try {
            const res = await api.get("/admin/suggestions");
            // Ordenamos para que las pendientes salgan primero
            const sorted = res.data.suggestions.sort((a, b) => {
                if (a.status === "PENDING" && b.status !== "PENDING") return -1;
                if (a.status !== "PENDING" && b.status === "PENDING") return 1;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
            setSuggestions(sorted);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingMedia = async () => {
        setLoading(true);
        try {
            const res = await api.get("/admin/media/pending");
            setPendingMedia(res.data.media);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleMediaStatus = async (mediaId, status, warnUser = false) => {
        try {
            await api.patch(`/admin/media/${mediaId}/status`, {
                status,
                warnUser,
            });
            fetchPendingMedia();
        } catch (err) {
            if (err.response?.status === 404) {
                return navigate("/404");
            }
            alert(err.response?.data?.message || "Error al actualizar la moderación");
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

    const handleToggleUserStatus = async (userId, newStatus) => {
        try {
            await api.patch(`/admin/users/${userId}/status`, {
                active: newStatus,
            });
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.message || "Error");
        }
    };

    const toggleSuggestion = async (id, currentStatus) => {
        const nextStatus = currentStatus === "PENDING" ? "REVIEWED" : "PENDING";
        try {
            await api.patch(`/admin/suggestions/${id}/status`, {
                status: nextStatus,
            });
            fetchSuggestions();
            fetchUsers(); // por las dudas
        } catch {
            alert("Error al actualizar sugerencia");
        }
    };

    const setSuggestionStatus = async (id, status) => {
        try {
            await api.patch(`/admin/suggestions/${id}/status`, {
                status: status,
            });
            fetchSuggestions();
            fetchUsers();
        } catch {
            alert("Error al actualizar sugerencia");
        }
    };

    const tabs = [
        { key: "dashboard", label: "📊 Dashboard" },
        { key: "reports", label: "📋 Reportes" },
        { key: "suggestions", label: "💡 Sugerencias" },
        { key: "moderation", label: "📸 Moderación" },
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

                {tab === "suggestions" && (
                    <div className="flex flex-col gap-4">
                        {loading ? (
                            <div className="text-center text-gray-400 py-8">
                                Cargando...
                            </div>
                        ) : suggestions.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center flex flex-col items-center justify-center">
                                <span className="text-4xl mb-3">🎉</span>
                                <h3 className="text-lg font-semibold text-gray-800">
                                    ¡Al día!
                                </h3>
                                <p className="text-gray-400 text-sm mt-1">
                                    No hay sugerencias nuevas pendientes de
                                    revisión.
                                </p>
                            </div>
                        ) : (
                            suggestions.map((s) => (
                                <div
                                    key={s.id}
                                    className={`bg-white rounded-2xl border ${s.status === "PENDING" ? "border-purple-200 shadow-sm" : "border-gray-200 opacity-60"} p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center transition-all`}
                                >
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded font-semibold uppercase ${s.status === "PENDING" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}
                                            >
                                                {s.reason.replace("_", " ")}
                                            </span>
                                            <span className="text-sm text-gray-400">
                                                por {s.user?.firstName}{" "}
                                                {s.user?.lastName}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 font-medium mb-1">
                                            {s.message}
                                        </p>
                                        {s.reportId && (
                                            <Link
                                                to={`/reports/${s.reportId}`}
                                                className="text-xs text-emerald-600 hover:underline"
                                            >
                                                Ver Reporte: {s.report?.title}
                                            </Link>
                                        )}
                                    </div>
                                    {s.reason === "BAN_APPEAL" ? (
                                        <div className="flex gap-2">
                                            {s.status === "PENDING" ? (
                                                <>
                                                    <button
                                                        onClick={() =>
                                                            setSuggestionStatus(
                                                                s.id,
                                                                "APPLIED",
                                                            )
                                                        }
                                                        className="text-xs px-3 py-1.5 border border-emerald-500 text-emerald-600 rounded-lg hover:bg-emerald-50 transition font-medium whitespace-nowrap"
                                                    >
                                                        ✔ Aprobar y Desbanear
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setSuggestionStatus(
                                                                s.id,
                                                                "REJECTED",
                                                            )
                                                        }
                                                        className="text-xs px-3 py-1.5 border border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition font-medium whitespace-nowrap"
                                                    >
                                                        ✖ Rechazar
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-xs px-3 py-1.5 font-medium text-gray-400">
                                                    {s.status === "APPLIED"
                                                        ? "Aprobada"
                                                        : "Rechazada"}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() =>
                                                toggleSuggestion(s.id, s.status)
                                            }
                                            className={`text-xs px-3 py-1.5 border rounded-lg transition font-medium whitespace-nowrap ${s.status === "PENDING" ? "border-emerald-500 text-emerald-600 hover:bg-emerald-50" : "border-gray-300 text-gray-500 hover:bg-gray-50"}`}
                                        >
                                            {s.status === "PENDING"
                                                ? "✔ Marcar como leída"
                                                : "Marcar como no leída"}
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Moderación de Medios */}
                {tab === "moderation" && (
                    <div className="flex flex-col gap-4">
                        {loading ? (
                            <div className="text-center text-gray-400 py-8">
                                Cargando...
                            </div>
                        ) : pendingMedia.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center flex flex-col items-center justify-center">
                                <span className="text-4xl mb-3">✨</span>
                                <h3 className="text-lg font-semibold text-gray-800">
                                    ¡Todo limpio!
                                </h3>
                                <p className="text-gray-400 text-sm mt-1">
                                    No hay fotos ni videos pendientes de
                                    moderación.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {pendingMedia.map((m) => (
                                    <div
                                        key={m.id}
                                        className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col"
                                    >
                                        <div className="h-48 bg-gray-100 relative">
                                            {m.type === "PHOTO" ? (
                                                <img
                                                    src={`http://localhost:3000${m.url}`}
                                                    alt="Media pendiente"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <video
                                                    src={`http://localhost:3000${m.url}`}
                                                    className="w-full h-full object-cover bg-black"
                                                    controls
                                                />
                                            )}
                                            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded backdrop-blur-md">
                                                {m.isAfter
                                                    ? "DESPUÉS"
                                                    : "ANTES"}
                                            </div>
                                        </div>
                                        <div className="p-4 flex flex-col flex-1">
                                            {m.reportId && (
                                                <div className="mb-2">
                                                    <p className="text-xs text-gray-500 uppercase font-semibold">
                                                        Reporte
                                                    </p>
                                                    <Link
                                                        to={`/reports/${m.reportId}`}
                                                        className="text-sm font-medium text-emerald-600 hover:underline line-clamp-1"
                                                    >
                                                        {m.report?.title}
                                                    </Link>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        Subido por{" "}
                                                        <span className="font-semibold text-gray-600">
                                                            {m.user?.firstName}{" "}
                                                            {m.user?.lastName}
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        en reporte de{" "}
                                                        {
                                                            m.report?.user
                                                                ?.firstName
                                                        }
                                                    </p>
                                                </div>
                                            )}
                                            {m.comment && (
                                                <div className="mb-2">
                                                    <p className="text-xs text-gray-500 uppercase font-semibold">
                                                        Comentario
                                                    </p>
                                                    <p className="text-sm text-gray-700 line-clamp-2">
                                                        "{m.comment.content}"
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        por{" "}
                                                        {
                                                            m.comment.user
                                                                ?.firstName
                                                        }{" "}
                                                        {
                                                            m.comment.user
                                                                ?.lastName
                                                        }
                                                    </p>
                                                </div>
                                            )}
                                            <div className="mt-auto pt-3 flex flex-col gap-2">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() =>
                                                            handleMediaStatus(
                                                                m.id,
                                                                "APPROVED",
                                                            )
                                                        }
                                                        className="flex-1 bg-emerald-100 text-emerald-700 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-200 transition"
                                                    >
                                                        Aprobar
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleMediaStatus(
                                                                m.id,
                                                                "REJECTED",
                                                            )
                                                        }
                                                        className="flex-1 bg-red-100 text-red-700 py-1.5 rounded-lg text-xs font-medium hover:bg-red-200 transition"
                                                    >
                                                        Rechazar
                                                    </button>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() =>
                                                            handleMediaStatus(
                                                                m.id,
                                                                "REJECTED",
                                                                true,
                                                            )
                                                        }
                                                        className="flex-1 bg-orange-100 text-orange-800 py-1.5 rounded-lg text-xs font-medium hover:bg-orange-200 transition"
                                                    >
                                                        Rechazar y Advertir
                                                    </button>
                                                    <Link
                                                        to={`/users/${m.report?.user?.id || m.comment?.user?.id}`}
                                                        target="_blank"
                                                        className="flex-1 bg-blue-100 text-blue-800 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-200 transition text-center flex items-center justify-center"
                                                    >
                                                        Detalle de usuario
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Usuarios — solo ADMIN */}
                {tab === "users" && user?.role === "ADMIN" && (
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-2 flex-wrap bg-white rounded-xl border border-gray-200 p-3">
                            <select
                                value={userSort}
                                onChange={(e) => setUserSort(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="recent">Más recientes</option>
                                <option value="name_asc">
                                    Alfabético (A-Z)
                                </option>
                                <option value="reputation_desc">
                                    Mayor reputación
                                </option>
                                <option value="reports_desc">
                                    Más reportes
                                </option>
                                <option value="warnings_desc">
                                    Más advertencias
                                </option>
                            </select>

                            <select
                                value={userRoleFilter}
                                onChange={(e) =>
                                    setUserRoleFilter(e.target.value)
                                }
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="">Todos los roles</option>
                                <option value="USER">Usuarios</option>
                                <option value="COLLABORATOR">
                                    Colaboradores
                                </option>
                                <option value="ADMIN">Administradores</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-3">
                            {loading ? (
                                <div className="text-center text-gray-400 py-8">
                                    Cargando...
                                </div>
                            ) : filteredAndSortedUsers.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
                                    No se encontraron usuarios con esos filtros
                                </div>
                            ) : (
                                filteredAndSortedUsers.map((u) => (
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
                                                {!u.active && (
                                                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                                                        Baneado
                                                    </span>
                                                )}
                                                <span className="text-xs text-gray-400">
                                                    ⭐ {u.reputation} pts
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    📋 {u._count?.reports}{" "}
                                                    reportes
                                                </span>
                                                {u.warnings > 0 && (
                                                    <span className="text-xs text-orange-600 font-medium">
                                                        ⚠ {u.warnings}{" "}
                                                        advertencias
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {u.id !== user.id &&
                                            u.role !== "ADMIN" && (
                                                <div className="flex gap-2 flex-col sm:flex-row">
                                                    <button
                                                        onClick={() =>
                                                            handleToggleUserStatus(
                                                                u.id,
                                                                !u.active,
                                                            )
                                                        }
                                                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition shrink-0 ${
                                                            u.active
                                                                ? "bg-orange-50 text-orange-700 hover:bg-orange-100"
                                                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                        }`}
                                                    >
                                                        {u.active
                                                            ? "Banear"
                                                            : "Desbanear"}
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleGrantCollaborator(
                                                                u.id,
                                                                u.role ===
                                                                    "COLLABORATOR",
                                                            )
                                                        }
                                                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition shrink-0 ${
                                                            u.role ===
                                                            "COLLABORATOR"
                                                                ? "bg-red-50 text-red-600 hover:bg-red-100"
                                                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                        }`}
                                                    >
                                                        {u.role ===
                                                        "COLLABORATOR"
                                                            ? "Quitar colaborador"
                                                            : "Hacer colaborador"}
                                                    </button>
                                                </div>
                                            )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
