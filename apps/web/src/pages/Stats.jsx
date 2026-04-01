import { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import Navbar from "../components/Navbar";
import api from "../services/api";
import "leaflet/dist/leaflet.css";

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

const STATUS_COLORS_HEX = {
    PENDING: "#f59e0b",
    APPROVED: "#3b82f6",
    IN_PROGRESS: "#8b5cf6",
    RESOLVED: "#10b981",
    REJECTED: "#ef4444",
    DUPLICATE: "#6b7280",
};

export default function Stats() {
    const [tab, setTab] = useState("overview");
    const [stats, setStats] = useState(null);
    const [ranking, setRanking] = useState([]);
    const [abandonment, setAbandonment] = useState([]);
    const [resolution, setResolution] = useState([]);
    const [heatmap, setHeatmap] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [s, r, a, res, h, l] = await Promise.all([
                api.get("/stats"),
                api.get("/stats/ranking"),
                api.get("/stats/abandonment"),
                api.get("/stats/resolution-time"),
                api.get("/stats/heatmap"),
                api.get("/stats/leaderboard"),
            ]);
            setStats(s.data);
            setRanking(r.data.ranking);
            setAbandonment(a.data.abandonment);
            setResolution(res.data.resolutionTime);
            setHeatmap(h.data.points);
            setLeaderboard(l.data.users);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { key: "overview", label: "📊 General" },
        { key: "ranking", label: "🏙️ Ciudades" },
        { key: "abandonment", label: "🚨 Abandono" },
        { key: "resolution", label: "⏱️ Resolución" },
        { key: "heatmap", label: "🗺️ Mapa de calor" },
        { key: "leaderboard", label: "🏆 Leaderboard" },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />

            <div className="max-w-5xl mx-auto w-full px-4 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Estadísticas públicas
                </h1>
                <p className="text-sm text-gray-400 mb-6">
                    Datos abiertos sobre el estado de la infraestructura urbana
                </p>

                <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-6 flex-wrap">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition min-w-fit px-2 ${
                                tab === t.key
                                    ? "bg-emerald-600 text-white"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center text-gray-400 py-16">
                        Cargando estadísticas...
                    </div>
                ) : (
                    <>
                        {/* Overview */}
                        {tab === "overview" && stats && (
                            <div className="flex flex-col gap-6">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {[
                                        {
                                            label: "Total reportes",
                                            value: stats.total,
                                            color: "text-gray-900",
                                        },
                                        {
                                            label: "Resueltos",
                                            value: stats.resolved,
                                            color: "text-emerald-600",
                                        },
                                        {
                                            label: "Pendientes",
                                            value: stats.pending,
                                            color: "text-amber-600",
                                        },
                                    ].map((s) => (
                                        <div
                                            key={s.label}
                                            className="bg-white rounded-2xl border border-gray-200 p-5 text-center"
                                        >
                                            <p
                                                className={`text-4xl font-bold ${s.color}`}
                                            >
                                                {s.value}
                                            </p>
                                            <p className="text-sm text-gray-400 mt-1">
                                                {s.label}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                        Por categoría
                                    </h3>
                                    <div className="flex flex-col gap-3">
                                        {stats.byCategory?.map((c) => {
                                            const max = Math.max(
                                                ...stats.byCategory.map(
                                                    (x) => x._count.id,
                                                ),
                                            );
                                            const pct = Math.round(
                                                (c._count.id / max) * 100,
                                            );
                                            return (
                                                <div key={c.category}>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-gray-600">
                                                            {
                                                                CATEGORY_LABELS[
                                                                    c.category
                                                                ]
                                                            }
                                                        </span>
                                                        <span className="font-medium text-gray-900">
                                                            {c._count.id}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 bg-gray-100 rounded-full">
                                                        <div
                                                            className="h-2 bg-emerald-500 rounded-full transition-all"
                                                            style={{
                                                                width: `${pct}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                        Por estado
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        {stats.byStatus?.map((s) => (
                                            <div
                                                key={s.status}
                                                className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl"
                                            >
                                                <div
                                                    className="w-2.5 h-2.5 rounded-full"
                                                    style={{
                                                        background:
                                                            STATUS_COLORS_HEX[
                                                                s.status
                                                            ],
                                                    }}
                                                />
                                                <span className="text-sm text-gray-600">
                                                    {s.status}
                                                </span>
                                                <span className="text-sm font-bold text-gray-900">
                                                    {s._count.id}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Ranking ciudades */}
                        {tab === "ranking" && (
                            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                    Ciudades con más problemas abiertos
                                </h3>
                                {ranking.length === 0 ? (
                                    <p className="text-sm text-gray-400">
                                        Sin datos suficientes
                                    </p>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {ranking.map((city, i) => (
                                            <div
                                                key={`${city.city}-${i}`}
                                                className="flex items-center gap-4"
                                            >
                                                <span className="text-lg font-bold text-gray-300 w-6 text-center">
                                                    {i + 1}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-800">
                                                        {city.city}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        {city.province}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-amber-600">
                                                        {city.openReports}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        abiertos
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Índice de abandono */}
                        {tab === "abandonment" && (
                            <div className="flex flex-col gap-4">
                                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                                    El índice de abandono mide el promedio de
                                    días que un reporte lleva abierto sin
                                    resolverse por ciudad.
                                </div>
                                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                                    {abandonment.length === 0 ? (
                                        <p className="text-sm text-gray-400">
                                            Sin datos suficientes
                                        </p>
                                    ) : (
                                        <div className="flex flex-col gap-4">
                                            {abandonment.map((city, i) => (
                                                <div
                                                    key={`${city.city}-${i}`}
                                                    className="flex items-center gap-4"
                                                >
                                                    <span className="text-lg font-bold text-gray-300 w-6 text-center">
                                                        {i + 1}
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-gray-800">
                                                            {city.city}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {city.openReports}{" "}
                                                            reportes abiertos
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p
                                                            className={`text-sm font-bold ${
                                                                city.avgDaysOpen >
                                                                30
                                                                    ? "text-red-600"
                                                                    : city.avgDaysOpen >
                                                                        14
                                                                      ? "text-amber-600"
                                                                      : "text-emerald-600"
                                                            }`}
                                                        >
                                                            {city.avgDaysOpen}{" "}
                                                            días
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            promedio
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tiempo de resolución */}
                        {tab === "resolution" && (
                            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                    Tiempo promedio de resolución por categoría
                                </h3>
                                {resolution.length === 0 ? (
                                    <p className="text-sm text-gray-400">
                                        Todavía no hay reportes resueltos para
                                        calcular
                                    </p>
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        {resolution
                                            .sort(
                                                (a, b) => b.avgDays - a.avgDays,
                                            )
                                            .map((r) => (
                                                <div
                                                    key={r.category}
                                                    className="flex items-center gap-4"
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span className="text-gray-600">
                                                                {
                                                                    CATEGORY_LABELS[
                                                                        r
                                                                            .category
                                                                    ]
                                                                }
                                                            </span>
                                                            <span className="font-medium text-gray-900">
                                                                {r.avgDays} días
                                                                ·{" "}
                                                                {
                                                                    r.totalResolved
                                                                }{" "}
                                                                resueltos
                                                            </span>
                                                        </div>
                                                        <div className="h-2 bg-gray-100 rounded-full">
                                                            <div
                                                                className="h-2 rounded-full transition-all"
                                                                style={{
                                                                    width: `${Math.min((r.avgDays / 90) * 100, 100)}%`,
                                                                    background:
                                                                        r.avgDays >
                                                                        30
                                                                            ? "#ef4444"
                                                                            : r.avgDays >
                                                                                14
                                                                              ? "#f59e0b"
                                                                              : "#10b981",
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Heatmap */}
                        {tab === "heatmap" && (
                            <div
                                className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
                                style={{ height: 500 }}
                            >
                                <MapContainer
                                    center={[-34.4198, -58.7293]}
                                    zoom={12}
                                    style={{ height: "100%", width: "100%" }}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    {heatmap.map((point, i) => (
                                        <CircleMarker
                                            key={i}
                                            center={[
                                                point.latitude,
                                                point.longitude,
                                            ]}
                                            radius={10}
                                            fillColor={
                                                STATUS_COLORS_HEX[
                                                    point.status
                                                ] || "#6b7280"
                                            }
                                            color="white"
                                            weight={1}
                                            fillOpacity={0.7}
                                        >
                                            <Tooltip>
                                                {
                                                    CATEGORY_LABELS[
                                                        point.category
                                                    ]
                                                }
                                            </Tooltip>
                                        </CircleMarker>
                                    ))}
                                </MapContainer>
                            </div>
                        )}
                        {/* Leaderboard */}
                        {tab === "leaderboard" && (
                            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                    🏆 Ranking de Vecinos
                                </h3>
                                {leaderboard.length === 0 ? (
                                    <p className="text-sm text-gray-400">
                                        No hay usuarios activos todavía.
                                    </p>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {leaderboard.map((user, i) => (
                                            <div
                                                key={user.id}
                                                className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100"
                                            >
                                                <span
                                                    className={`text-xl font-bold w-6 text-center ${i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-700" : "text-gray-300"}`}
                                                >
                                                    {i + 1}
                                                </span>
                                                {user.avatarUrl ? (
                                                    <img
                                                        src={`${user.avatarUrl?.startsWith("http") ? user.avatarUrl : `${import.meta.env.VITE_API_URL.replace("/api", "")}${user.avatarUrl}`}`}
                                                        alt="Avatar"
                                                        className="w-10 h-10 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                                                        {user.firstName?.[0]}
                                                        {user.lastName?.[0]}
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-gray-900">
                                                        {user.firstName}{" "}
                                                        {user.lastName}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {user.reportsCount ||
                                                            user._count
                                                                ?.reports}{" "}
                                                        reportes creados
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-emerald-600 flex items-center gap-1 justify-end">
                                                        ⭐ {user.reputation}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        Puntos de reputación
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
