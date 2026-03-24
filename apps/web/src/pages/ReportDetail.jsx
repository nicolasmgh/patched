import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Navbar from "../components/Navbar";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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

const URGENCY_LABELS = { LOW: "Baja", MEDIUM: "Media", HIGH: "Alta" };
const URGENCY_COLORS = {
    LOW: "text-gray-500",
    MEDIUM: "text-amber-500",
    HIGH: "text-red-500",
};

export default function ReportDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [followed, setFollowed] = useState(false);

    useEffect(() => {
        fetchReport();
    }, [id]);

    const fetchReport = async () => {
        try {
            const res = await api.get(`/reports/${id}`);
            setReport(res.data.report);
            if (user) {
                setConfirmed(
                    res.data.report.confirmations.some(
                        (c) => c.userId === user.id,
                    ),
                );
                setFollowed(
                    res.data.report.follows?.some((f) => f.userId === user.id),
                );
            }
        } catch {
            navigate("/");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!user) return navigate("/login");
        try {
            if (confirmed) {
                await api.delete(`/interactions/confirm/${id}`);
                setConfirmed(false);
                setReport((r) => ({
                    ...r,
                    _count: {
                        ...r._count,
                        confirmations: r._count.confirmations - 1,
                    },
                }));
            } else {
                await api.post(`/interactions/confirm/${id}`);
                setConfirmed(true);
                setReport((r) => ({
                    ...r,
                    _count: {
                        ...r._count,
                        confirmations: r._count.confirmations + 1,
                    },
                }));
            }
        } catch (err) {
            alert(err.response?.data?.message || "Error");
        }
    };

    const handleFollow = async () => {
        if (!user) return navigate("/login");
        try {
            if (followed) {
                await api.delete(`/interactions/follow/${id}`);
                setFollowed(false);
            } else {
                await api.post(`/interactions/follow/${id}`);
                setFollowed(true);
            }
        } catch (err) {
            alert(err.response?.data?.message || "Error");
        }
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!user) return navigate("/login");
        if (!comment.trim()) return;
        setSubmitting(true);
        try {
            const res = await api.post(`/comments/${id}`, { content: comment });
            setReport((r) => ({
                ...r,
                comments: [...r.comments, res.data.comment],
            }));
            setComment("");
        } catch (err) {
            alert(err.response?.data?.message || "Error");
        } finally {
            setSubmitting(false);
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

    if (!report) return null;

    const beforePhotos = report.media.filter((m) => m.isBefore);
    const afterPhotos = report.media.filter((m) => m.isAfter);
    const generalPhotos = report.media.filter((m) => !m.isBefore && !m.isAfter);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />

            <div className="max-w-4xl mx-auto w-full px-4 py-8">
                {/* Header */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {report.title}
                        </h1>
                        <span
                            className={`text-sm px-3 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[report.status]}`}
                        >
                            {STATUS_LABELS[report.status]}
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-4">
                        <span>📍 {report.address || report.city}</span>
                        <span>🏷️ {CATEGORY_LABELS[report.category]}</span>
                        <span
                            className={`font-medium ${URGENCY_COLORS[report.urgency]}`}
                        >
                            ⚡ Urgencia {URGENCY_LABELS[report.urgency]}
                        </span>
                        <span>
                            📅{" "}
                            {new Date(report.createdAt).toLocaleDateString(
                                "es-AR",
                            )}
                        </span>
                    </div>

                    {report.description && (
                        <p className="text-gray-600 text-sm mb-4">
                            {report.description}
                        </p>
                    )}

                    {/* Reportado por */}
                    {report.user && (
                        <p className="text-xs text-gray-400">
                            Reportado por {report.user.firstName}{" "}
                            {report.user.hideLastName
                                ? ""
                                : report.user.lastName}
                        </p>
                    )}

                    {/* Acciones */}
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={handleConfirm}
                            disabled={user?.id === report.userId}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                                confirmed
                                    ? "bg-emerald-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                            ✓ Confirmar · {report._count.confirmations}
                        </button>

                        <button
                            onClick={handleFollow}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                                followed
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            🔔 {followed ? "Siguiendo" : "Seguir"}
                        </button>

                        <button
                            onClick={() => {
                                navigator.share?.({
                                    title: report.title,
                                    url: window.location.href,
                                }) ||
                                    navigator.clipboard.writeText(
                                        window.location.href,
                                    );
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                        >
                            📤 Compartir
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Mapa */}
                    <div
                        className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
                        style={{ height: 250 }}
                    >
                        <MapContainer
                            center={[report.latitude, report.longitude]}
                            zoom={15}
                            style={{ height: "100%", width: "100%" }}
                            zoomControl={false}
                        >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Marker
                                position={[report.latitude, report.longitude]}
                            />
                        </MapContainer>
                    </div>

                    {/* Fotos generales */}
                    {generalPhotos.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-200 p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                Fotos
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                {generalPhotos.map((m) => (
                                    <a
                                        key={m.id}
                                        href={`http://localhost:3000${m.url}`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <img
                                            src={`http://localhost:3000${m.url}`}
                                            className="w-full h-20 object-cover rounded-lg hover:opacity-90 transition"
                                            alt="foto del reporte"
                                        />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Antes / Después */}
                {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            Antes / Después
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-400 mb-2">
                                    Antes
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                    {beforePhotos.map((m) => (
                                        <img
                                            key={m.id}
                                            src={`http://localhost:3000${m.url}`}
                                            className="h-24 rounded-lg object-cover"
                                            alt="antes"
                                        />
                                    ))}
                                    {beforePhotos.length === 0 && (
                                        <p className="text-xs text-gray-300">
                                            Sin fotos
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 mb-2">
                                    Después
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                    {afterPhotos.map((m) => (
                                        <img
                                            key={m.id}
                                            src={`http://localhost:3000${m.url}`}
                                            className="h-24 rounded-lg object-cover"
                                            alt="después"
                                        />
                                    ))}
                                    {afterPhotos.length === 0 && (
                                        <p className="text-xs text-gray-300">
                                            Sin fotos
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Comentarios */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">
                        Comentarios · {report._count.comments}
                    </h3>

                    <div className="flex flex-col gap-4 mb-6">
                        {report.comments.length === 0 ? (
                            <p className="text-sm text-gray-400">
                                Todavía no hay comentarios
                            </p>
                        ) : (
                            report.comments.map((c) => (
                                <div key={c.id} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-medium text-emerald-700 shrink-0">
                                        {c.user.firstName[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">
                                            {c.user.firstName}{" "}
                                            {c.user.hideLastName
                                                ? ""
                                                : c.user.lastName}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            {c.content}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {new Date(
                                                c.createdAt,
                                            ).toLocaleDateString("es-AR")}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {user ? (
                        <form onSubmit={handleComment} className="flex gap-3">
                            <input
                                type="text"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Escribí un comentario..."
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <button
                                type="submit"
                                disabled={submitting || !comment.trim()}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
                            >
                                Enviar
                            </button>
                        </form>
                    ) : (
                        <p className="text-sm text-gray-400">
                            <Link
                                to="/login"
                                className="text-emerald-600 font-medium"
                            >
                                Iniciá sesión
                            </Link>{" "}
                            para comentar
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
