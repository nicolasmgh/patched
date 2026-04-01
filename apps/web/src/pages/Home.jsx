import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Map from "../components/Map";
import UserAvatar from "../components/UserAvatar";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const CATEGORY_LABELS = {
    POTHOLE: "Bache",
    SIDEWALK: "Vereda",
    STREET_LIGHTING: "Luminaria",
    ROAD_DAMAGE: "Calzada",
    WASTE_MANAGEMENT: "Basura",
    STORM_DRAINAGE: "Desagüe",
    WATER_SANITATION: "Cloacas",
    POWER_GRID: "Luz",
    TRAFFIC: "Tránsito",
    PUBLIC_SAFETY: "Seguridad",
    URBAN_PLANNING: "Obras",
    GREEN_SPACES: "Espacios verdes",
    OTHER: "Otro",
};

const CATEGORY_COLORS = {
    POTHOLE: "#ef4444",
    SIDEWALK: "#f97316",
    STREET_LIGHTING: "#eab308",
    ROAD_DAMAGE: "#dc2626",
    WASTE_MANAGEMENT: "#84cc16",
    STORM_DRAINAGE: "#06b6d4",
    WATER_SANITATION: "#3b82f6",
    POWER_GRID: "#8b5cf6",
    TRAFFIC: "#f59e0b",
    PUBLIC_SAFETY: "#ec4899",
    URBAN_PLANNING: "#6366f1",
    GREEN_SPACES: "#22c55e",
    OTHER: "#6b7280",
};

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

export default function Home() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ category: "", city: "" });

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);
    const [mapBounds, setMapBounds] = useState(null);
    const [suggestPosition, setSuggestPosition] = useState(null);
    const [lightboxMedia, setLightboxMedia] = useState(null);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const openLightbox = (mediaArray, startIndex) => {
        setLightboxMedia(mediaArray);
        setLightboxIndex(startIndex);
    };
    const nextMedia = () => {
        if (lightboxMedia)
            setLightboxIndex((i) => (i + 1) % lightboxMedia.length);
    };
    const prevMedia = () => {
        if (lightboxMedia)
            setLightboxIndex(
                (i) => (i - 1 + lightboxMedia.length) % lightboxMedia.length,
            );
    };
    const sidebarWasOpen = useRef(false);

    useEffect(() => {
        fetchReports();
    }, [filters, mapBounds]);

    const fetchReports = async () => {
        try {
            // No resetear la pantalla entera solo por mover el mapa
            if (reports.length === 0) setLoading(true);
            const params = Object.fromEntries(
                Object.entries(filters).filter(([, v]) => v),
            );
            params.status = "APPROVED,IN_PROGRESS";

            if (mapBounds) {
                params.minLat = mapBounds._southWest.lat;
                params.maxLat = mapBounds._northEast.lat;
                params.minLng = mapBounds._southWest.lng;
                params.maxLng = mapBounds._northEast.lng;
            }

            const res = await api.get("/reports", { params });
            // Guardar solo si cambiaron para no forzar re-render si no hay nuevos
            // o podrÃ­amos mergearlos, pero reemplazar funciona si la query de bounds trae todo
            setReports(res.data.reports);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const visibleReports = reports;

    const handleCloseReport = () => {
        if (sidebarWasOpen.current) {
            setSelectedReport(null);
            setSidebarOpen(true);
        } else {
            setSidebarOpen(false);
            setTimeout(() => setSelectedReport(null), 300);
        }
    };

    const handleMapClick = (latlng) => {
        if (selectedReport) {
            handleCloseReport();
            return;
        }
        setSuggestPosition(latlng);
    };

    const handleMarkerDragEnd = (latlng) => {
        setSuggestPosition(latlng);
    };

    const handleReportClick = (report) => {
        setSuggestPosition(null);
        if (!selectedReport) {
            sidebarWasOpen.current = sidebarOpen;
        }
        setSelectedReport(report);
        setSidebarOpen(true);
    };

    const handleSuggestConfirm = () => {
        navigate(
            `/new-report?lat=${suggestPosition.lat}&lng=${suggestPosition.lng}`,
        );
    };

    return (
        <div className="h-screen flex flex-col">
            <Navbar />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Botón hamburguesa — solo visible cuando sidebar está cerrado */}
                {!sidebarOpen && (
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="absolute top-3 left-3 z-[1000] bg-white rounded-lg shadow-md p-2 hover:bg-gray-50 transition cursor-pointer"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-5 h-5 text-gray-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                        </svg>
                    </button>
                )}

                {/* Sidebar */}
                <div
                    className={`
                        absolute top-0 left-0 h-full z-[999] bg-white 
                        flex flex-col overflow-hidden transition-all duration-300 shadow-lg
                        ${sidebarOpen ? "w-80 border-r border-gray-200" : "w-0 border-none"}
                    `}
                >
                    <div className="w-80 h-full flex flex-col">
                        {selectedReport ? (
                            // panel de reporte — igual que antes pero cambiá el botón volver:
                            <div className="flex flex-col h-full">
                                <div
                                    className="h-1.5 w-full"
                                    style={{
                                        background:
                                            CATEGORY_COLORS[
                                                selectedReport.category
                                            ],
                                    }}
                                />
                                <div className="p-4 border-b border-gray-100">
                                    <button
                                        onClick={handleCloseReport}
                                        className="text-xs text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-1 cursor-pointer"
                                    >
                                        ← Cerrar
                                    </button>
                                    <h2 className="text-lg font-bold text-gray-900 leading-tight">
                                        {selectedReport.title}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {selectedReport.address ||
                                            selectedReport.city}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <span
                                            className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                                            style={{
                                                background:
                                                    CATEGORY_COLORS[
                                                        selectedReport.category
                                                    ],
                                            }}
                                        >
                                            {
                                                CATEGORY_LABELS[
                                                    selectedReport.category
                                                ]
                                            }
                                        </span>
                                    </div>

                                    {selectedReport.description && (
                                        <p className="text-sm text-gray-600 mt-3">
                                            {selectedReport.description}
                                        </p>
                                    )}

                                    <div className="flex gap-4 mt-3 text-xs text-gray-400">
                                        <span>
                                            ✓{" "}
                                            {
                                                selectedReport._count
                                                    ?.confirmations
                                            }{" "}
                                            confirmaciones
                                        </span>
                                        <span>
                                            💬 {selectedReport._count?.comments}{" "}
                                            comentarios
                                        </span>
                                    </div>

                                    {(() => {
                                        const filteredMedia =
                                            selectedReport.media.filter(
                                                (m) => m.status === "APPROVED",
                                            );
                                        return (
                                            filteredMedia.length > 0 && (
                                                <div className="grid grid-cols-3 gap-2 mt-3">
                                                    {filteredMedia
                                                        .slice(0, 9)
                                                        .map((m, idx) => (
                                                            <button
                                                                key={m.id}
                                                                type="button"
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    e.preventDefault();
                                                                    openLightbox(
                                                                        filteredMedia,
                                                                        idx,
                                                                    );
                                                                }}
                                                                className="w-full text-left relative aspect-square cursor-pointer"
                                                            >
                                                                {m.type ===
                                                                "VIDEO" ? (
                                                                    <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center relative hover:opacity-90 transition">
                                                                        <video
                                                                            src={`http://localhost:3000${m.url}`}
                                                                            className="w-full h-full object-cover rounded-lg opacity-50"
                                                                        />
                                                                        <span className="absolute text-white text-2xl drop-shadow-md">
                                                                            ▶
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <img
                                                                        src={`http://localhost:3000${m.url}`}
                                                                        className="w-full h-full aspect-square object-cover rounded-lg hover:opacity-90 transition"
                                                                        alt="foto"
                                                                    />
                                                                )}
                                                            </button>
                                                        ))}
                                                </div>
                                            )
                                        );
                                    })()}

                                    <div className="flex gap-2 mt-4">
                                        <Link
                                            to={`/reports/${selectedReport.id}`}
                                            className="flex-1 bg-emerald-600 text-white text-sm font-medium py-2 rounded-lg text-center hover:bg-emerald-700 transition"
                                        >
                                            Ver detalle
                                        </Link>
                                        {user && (
                                            <Link
                                                to={`/reports/${selectedReport.id}?suggest=true`}
                                                className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2 rounded-lg text-center hover:bg-gray-200 transition"
                                            >
                                                Sugerir cambios
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                {selectedReport.user && (
                                    <div className="px-4 py-3 text-xs text-gray-400">
                                        Reportado por{" "}
                                        <Link
                                            to={
                                                user?.id ===
                                                selectedReport.user.id
                                                    ? "/profile"
                                                    : `/users/${selectedReport.user.id}`
                                            }
                                            className="text-emerald-600 hover:underline"
                                        >
                                            {selectedReport.user.firstName}{" "}
                                            {selectedReport.user.hideLastName
                                                ? ""
                                                : selectedReport.user.lastName}
                                        </Link>
                                        {" · "}
                                        {new Date(
                                            selectedReport.createdAt,
                                        ).toLocaleDateString("es-AR")}
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Lista normal
                            <>
                                <div className="p-4 pt-4 border-b border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-semibold text-gray-700">
                                            Filtros
                                        </h2>
                                        <button
                                            onClick={() =>
                                                setSidebarOpen(false)
                                            }
                                            className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="w-4 h-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M6 18L18 6M6 6l12 12"
                                                />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="p-4 border-b border-gray-100">
                                        <div className="flex flex-col gap-2">
                                            <select
                                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                value={filters.category}
                                                onChange={(e) =>
                                                    setFilters((f) => ({
                                                        ...f,
                                                        category:
                                                            e.target.value,
                                                    }))
                                                }
                                            >
                                                <option value="">
                                                    Todas las categorías
                                                </option>
                                                {Object.entries(
                                                    CATEGORY_LABELS,
                                                ).map(([k, v]) => (
                                                    <option key={k} value={k}>
                                                        {v}
                                                    </option>
                                                ))}
                                            </select>{" "}
                                        </div>
                                    </div>

                                    <div className="px-4 py-2 border-b border-gray-100">
                                        <p className="text-xs text-gray-400">
                                            {visibleReports.length} reporte
                                            {visibleReports.length !== 1
                                                ? "s"
                                                : ""}{" "}
                                            en esta área
                                        </p>
                                    </div>

                                    <div className="flex-1 overflow-y-auto">
                                        {loading ? (
                                            <div className="p-4 text-sm text-gray-400 text-center">
                                                Cargando...
                                            </div>
                                        ) : visibleReports.length === 0 ? (
                                            <div className="p-4 text-sm text-gray-400 text-center">
                                                No hay reportes en esta área
                                            </div>
                                        ) : (
                                            visibleReports.map((report) => (
                                                <button
                                                    key={report.id}
                                                    onClick={() =>
                                                        handleReportClick(
                                                            report,
                                                        )
                                                    }
                                                    className="w-full text-left block p-4 border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-start gap-2">
                                                            <div
                                                                className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                                                                style={{
                                                                    background:
                                                                        CATEGORY_COLORS[
                                                                            report
                                                                                .category
                                                                        ],
                                                                }}
                                                            />
                                                            <p className="text-sm font-medium text-gray-800 leading-tight">
                                                                {report.title}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-1 ml-4">
                                                        {report.address ||
                                                            report.city}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1 ml-4">
                                                        <span className="text-xs text-gray-400">
                                                            {
                                                                CATEGORY_LABELS[
                                                                    report
                                                                        .category
                                                                ]
                                                            }
                                                        </span>
                                                        <span className="text-xs text-gray-300">
                                                            ·
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            {
                                                                report._count
                                                                    ?.confirmations
                                                            }{" "}
                                                            confirmaciones
                                                        </span>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Mapa */}
                <div className="flex-1">
                    <Map
                        reports={reports}
                        onMapClick={handleMapClick}
                        onReportClick={handleReportClick}
                        onBoundsChange={setMapBounds}
                        selectedPosition={suggestPosition}
                        onMarkerDragEnd={handleMarkerDragEnd}
                        selectedReportId={selectedReport?.id}
                    />
                </div>

                {/* Sugerencia de nuevo reporte */}
                {suggestPosition && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-2xl shadow-lg border border-gray-200 px-5 py-4 flex items-center gap-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-800">
                                ¿Hay un problema acá?
                            </p>
                            <p className="text-xs text-gray-400">
                                {suggestPosition.lat.toFixed(5)},{" "}
                                {suggestPosition.lng.toFixed(5)}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSuggestPosition(null)}
                                className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSuggestConfirm}
                                className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition font-medium cursor-pointer"
                            >
                                Reportar acá
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            {lightboxMedia && (
                <div className="fixed inset-0 z-[10000] bg-black/95 flex flex-col items-center justify-center">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setLightboxMedia(null);
                        }}
                        className="absolute top-4 right-4 z-20 text-white hover:text-gray-300 w-10 h-10 flex items-center justify-center text-4xl font-light cursor-pointer"
                    >
                        &times;
                    </button>

                    <div className="relative flex-1 w-full flex items-center justify-center min-h-0 py-8">
                        {lightboxMedia.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    prevMedia();
                                }}
                                className="absolute left-2 md:left-8 z-10 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white hover:text-gray-300 hover:bg-white/10 rounded-full transition text-4xl pb-1 cursor-pointer"
                            >
                                &#8249;
                            </button>
                        )}

                        <div className="relative max-w-[90vw] max-h-full flex items-center justify-center">
                            {lightboxMedia[lightboxIndex].type === "VIDEO" ? (
                                <video
                                    src={`http://localhost:3000${lightboxMedia[lightboxIndex].url}`}
                                    controls
                                    autoPlay
                                    className="max-w-full max-h-[80vh] object-contain rounded"
                                />
                            ) : (
                                <img
                                    src={`http://localhost:3000${lightboxMedia[lightboxIndex].url}`}
                                    alt="Vista ampliada"
                                    className="max-w-full max-h-[80vh] object-contain rounded shadow-2xl"
                                />
                            )}

                            {/* Contador de imágenes */}
                            {lightboxMedia.length > 1 && (
                                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white text-sm bg-black/40 px-3 py-1 rounded-full">
                                    {lightboxIndex + 1} / {lightboxMedia.length}
                                </div>
                            )}
                        </div>

                        {lightboxMedia.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    nextMedia();
                                }}
                                className="absolute right-2 md:right-8 z-10 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white hover:text-gray-300 hover:bg-white/10 rounded-full transition text-4xl pb-1 cursor-pointer"
                            >
                                &#8250;
                            </button>
                        )}
                    </div>

                    {/* Footer con info del uploader estilo Komoot */}
                    {lightboxMedia[lightboxIndex].user && (
                        <div className="w-full shrink-0 h-24 flex items-center justify-center pb-6">
                            <Link
                                to={`/users/${lightboxMedia[lightboxIndex].user.id}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxMedia(null);
                                }}
                                className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-xl transition cursor-pointer"
                            >
                                <UserAvatar
                                    user={lightboxMedia[lightboxIndex].user}
                                    className="w-10 h-10 border border-gray-600"
                                    textClass="text-lg"
                                    fallbackBg="bg-emerald-600"
                                    fallbackText="text-white"
                                />
                                <div className="flex flex-col text-left">
                                    <span className="text-gray-300 text-sm">
                                        Foto por{" "}
                                        <span className="text-emerald-500 font-medium hover:underline transition">
                                            {
                                                lightboxMedia[lightboxIndex]
                                                    .user.firstName
                                            }{" "}
                                            {lightboxMedia[lightboxIndex].user
                                                .hideLastName
                                                ? ""
                                                : lightboxMedia[lightboxIndex]
                                                      .user.lastName}
                                        </span>
                                    </span>
                                    <span className="text-gray-500 text-xs mt-0.5">
                                        {new Date(
                                            lightboxMedia[lightboxIndex]
                                                .createdAt || Date.now(),
                                        ).toLocaleDateString("es-AR", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </span>
                                </div>
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
