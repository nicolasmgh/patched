import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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

export default function PublicProfile() {
    const { userId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("reports");

    useEffect(() => {
        if (user?.id === userId) return navigate("/profile");
        fetchProfile();
    }, [userId]);

    const fetchProfile = async () => {
        try {
            const res = await api.get(`/users/${userId}`);
            setProfile(res.data.user);
        } catch {
            // usuario no encontrado
        } finally {
            setLoading(false);
        }
    };

    if (loading)
        return (
            <div className="h-screen flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center text-gray-400">
                    Cargando...
                </div>
            </div>
        );

    if (!profile)
        return (
            <div className="h-screen flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center text-gray-400">
                    Usuario no encontrado
                </div>
            </div>
        );

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />
            <div className="max-w-2xl mx-auto w-full px-4 py-8">
                {/* Header */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-2xl font-bold text-emerald-700">
                            {profile.firstName[0]}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                {profile.firstName}{" "}
                                {profile.hideLastName ? "" : profile.lastName}
                            </h1>
                            {profile.username && (
                                <p className="text-sm font-medium text-emerald-600">
                                    @{profile.username}
                                </p>
                            )}
                            <span className="text-xs text-gray-400 mt-1 block">
                                ⭐ {profile.reputation} pts
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">
                                {profile._count?.reports}
                            </p>
                            <p className="text-xs text-gray-400">Reportes</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">
                                {profile._count?.confirmations}
                            </p>
                            <p className="text-xs text-gray-400">
                                Confirmaciones dadas
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-4">
                    {[
                        { key: "reports", label: "Reportes" },
                        { key: "badges", label: "Badges" },
                    ].map((t) => (
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

                {/* Tab: Reportes */}
                {tab === "reports" && (
                    <div className="flex flex-col gap-3">
                        {profile.reports?.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                                <p className="text-gray-400 text-sm">
                                    Este usuario no tiene reportes
                                </p>
                            </div>
                        ) : (
                            profile.reports?.map((r) => (
                                <Link
                                    key={r.id}
                                    to={`/reports/${r.id}`}
                                    className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-emerald-300 transition flex items-start justify-between gap-4"
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">
                                            {r.title}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {CATEGORY_LABELS[r.category]} ·{" "}
                                            {new Date(
                                                r.createdAt,
                                            ).toLocaleDateString("es-AR")}
                                        </p>
                                        <div className="flex gap-3 mt-2 text-xs text-gray-400">
                                            <span>
                                                ✓ {r._count.confirmations}
                                            </span>
                                            <span>💬 {r._count.comments}</span>
                                        </div>
                                    </div>
                                    <span
                                        className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[r.status]}`}
                                    >
                                        {STATUS_LABELS[r.status]}
                                    </span>
                                </Link>
                            ))
                        )}
                    </div>
                )}

                {/* Tab: Badges */}
                {tab === "badges" && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        {profile.badges?.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center">
                                Este usuario no tiene badges todavía
                            </p>
                        ) : (
                            <div className="grid grid-cols-3 gap-4">
                                {profile.badges?.map((ub) => (
                                    <div
                                        key={ub.id}
                                        className="text-center p-4 bg-gray-50 rounded-xl"
                                    >
                                        <p className="text-2xl mb-1">
                                            {ub.badge.iconUrl || "🏅"}
                                        </p>
                                        <p className="text-sm font-medium text-gray-800">
                                            {ub.badge.name}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {ub.badge.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
