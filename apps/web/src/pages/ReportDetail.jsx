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

const parseMentions = (text) => {
    if (!text) return text;
    const regex = /(@[a-zA-Z0-9_]+)/g;
    const parts = text.split(regex);
    
    return parts.map((part, i) => {
        if (regex.test(part)) {
            const username = part.substring(1);
            return (
                <Link
                    key={i}
                    to={`/users/${username}`}
                    className="text-emerald-600 font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </Link>
            );
        }
        return part;
    });
};

export default function ReportDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState("");
    const [commentFiles, setCommentFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [followed, setFollowed] = useState(false);

    // Sugerir modal
    const [showSuggestModal, setShowSuggestModal] = useState(false);
    const [suggestForm, setSuggestForm] = useState({
        reason: "STATUS_CHANGE",
        message: "",
    });
    const [suggesting, setSuggesting] = useState(false);

    // Lightbox modal para fotos y videos
    const [lightboxMedia, setLightboxMedia] = useState(null);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [showUploadModal, setShowUploadModal] = useState(false);

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

    useEffect(() => {
        fetchReport();
        if (window.location.search.includes("suggest=true")) {
            setShowSuggestModal(true);
        }
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
            fetchReport(); // fetch again to update counts
        } catch (err) {
            alert(err.response?.data?.message || "Error");
        }
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!user) return navigate("/login");
        if (!comment.trim() && commentFiles.length === 0) return;
        setSubmitting(true);
        try {
            // First, post the comment text (or empty string if only files)
            const content = comment.trim() || "[Imagen adjunta]";
            const res = await api.post(`/comments/${id}`, { content });
            const commentId = res.data.comment.id;

            // Then, if there are files, upload them
            let newComment = res.data.comment;
            if (commentFiles.length > 0) {
                const formData = new FormData();
                commentFiles.forEach((f) => formData.append("files", f));
                const mediaRes = await api.post(
                    `/media/comment/${commentId}`,
                    formData,
                    {
                        headers: { "Content-Type": "multipart/form-data" },
                    },
                );
                newComment.media = mediaRes.data.media;
            }

            setReport((r) => ({
                ...r,
                comments: [...r.comments, newComment],
            }));
            setComment("");
            setCommentFiles([]);
        } catch (err) {
            alert(err.response?.data?.message || "Error al comentar");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSuggest = async (e) => {
        e.preventDefault();
        setSuggesting(true);
        try {
            await api.post(`/reports/${id}/suggest`, suggestForm);
            setShowSuggestModal(false);
            setSuggestForm({ reason: "STATUS_CHANGE", message: "" });
            alert("Sugerencia enviada a revisión");
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Error al enviar sugerencia");
        } finally {
            setSuggesting(false);
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

    const beforePhotos = report.media.filter(
        (m) => m.isBefore && m.status === "APPROVED"
    );
    const afterPhotos = report.media.filter(
        (m) => m.isAfter && m.status === "APPROVED"
    );
    const generalPhotos = report.media.filter(
        (m) => !m.isBefore && !m.isAfter && m.status === "APPROVED"
    );

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
                    <Link
                        to={
                            user?.id === report.user?.id
                                ? "/profile"
                                : `/users/${report.user?.id}`
                        }
                        className="text-xs text-emerald-600 hover:underline"
                    >
                            Reportado por {report.user?.firstName}{" "}
                            {report.user?.hideLastName ? "" : report.user?.lastName}
                            {report.user?.username && <span className="text-gray-500 ml-1 font-normal">@{report.user.username}</span>}
                        </Link>

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

                        {user && (
                            <button
                                onClick={() => setShowSuggestModal(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 transition ml-auto"
                            >
                                ✏️ Sugerir cambios
                            </button>
                        )}
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
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 h-[250px] flex flex-col">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            Fotos y videos
                        </h3>
                        <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-2 pb-2 content-start">
                            {user && (
                                <label className="w-full aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-emerald-500 transition">
                                    <input
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.webp,.mp4"
                                        multiple
                                        className="hidden"
                                        onChange={async (e) => {
                                            const files = Array.from(
                                                e.target.files,
                                            );
                                            if (files.length === 0) return;

                                            // Handle file upload here
                                            const formData = new FormData();
                                            files.forEach((f) =>
                                                formData.append("files", f),
                                            );

                                            try {
                                                await api.post(
                                                    `/media/report/${id}`,
                                                    formData,
                                                    {
                                                        headers: {
                                                            "Content-Type":
                                                                "multipart/form-data",
                                                        },
                                                    },
                                                );
                                                fetchReport();
                                                setShowUploadModal(true);
                                            } catch (err) {
                                                console.error(err);
                                                alert(
                                                    err.response?.data
                                                        ?.message ||
                                                        "Error al subir fotos",
                                                );
                                            }
                                        }}
                                    />
                                    <span className="text-gray-400 text-2xl font-light">
                                        +
                                    </span>
                                </label>
                            )}
                            {generalPhotos.map((m, idx) => (
                                <button
                                    key={m.id}
                                    onClick={() =>
                                        openLightbox(generalPhotos, idx)
                                    }
                                    className="w-full text-left relative aspect-square"
                                >
                                    {m.type === "VIDEO" ? (
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
                                            className="w-full h-full object-cover rounded-lg hover:opacity-90 transition"
                                            alt="foto del reporte"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
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
                                    {beforePhotos.map((m, idx) => (
                                        <button
                                            key={m.id}
                                            onClick={() =>
                                                openLightbox(beforePhotos, idx)
                                            }
                                            className="relative text-left"
                                        >
                                            {m.type === "VIDEO" ? (
                                                <div className="h-24 aspect-square bg-gray-900 rounded-lg flex items-center justify-center relative hover:opacity-90 transition">
                                                    <video
                                                        src={`http://localhost:3000${m.url}`}
                                                        className="w-full h-full object-cover rounded-lg opacity-50"
                                                    />
                                                    <span className="absolute text-white text-xl">
                                                        ▶
                                                    </span>
                                                </div>
                                            ) : (
                                                <img
                                                    src={`http://localhost:3000${m.url}`}
                                                    className="h-24 aspect-square rounded-lg object-cover hover:opacity-90 transition"
                                                    alt="antes"
                                                />
                                            )}
                                        </button>
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
                                    {afterPhotos.map((m, idx) => (
                                        <button
                                            key={m.id}
                                            onClick={() =>
                                                openLightbox(afterPhotos, idx)
                                            }
                                            className="relative text-left"
                                        >
                                            {m.type === "VIDEO" ? (
                                                <div className="h-24 aspect-square bg-gray-900 rounded-lg flex items-center justify-center relative hover:opacity-90 transition">
                                                    <video
                                                        src={`http://localhost:3000${m.url}`}
                                                        className="w-full h-full object-cover rounded-lg opacity-50"
                                                    />
                                                    <span className="absolute text-white text-xl">
                                                        ▶
                                                    </span>
                                                </div>
                                            ) : (
                                                <img
                                                    src={`http://localhost:3000${m.url}`}
                                                    className="h-24 aspect-square rounded-lg object-cover hover:opacity-90 transition"
                                                    alt="después"
                                                />
                                            )}
                                        </button>
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
                            report.comments.map((c) => {
                                const liked =
                                    user &&
                                    c.likes?.some((l) => l.userId === user.id);
                                return (
                                    <div key={c.id} className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-medium text-emerald-700 shrink-0">
                                            {c.user.firstName[0]}
                                        </div>
                                        <div className="flex-1">
                                            <Link
                                                to={
                                                    user?.id === c.userId
                                                        ? "/profile"
                                                        : `/users/${c.user.id}`
                                                }
                                                className="text-sm font-medium text-gray-800 hover:text-emerald-600 transition"
                                            >
                                                {c.user.firstName}{" "}
                                                    {c.user.hideLastName ? "" : c.user.lastName}
                                                    {c.user.username && <span className="text-gray-500 ml-1 font-normal">@{c.user.username}</span>}
                                            </Link>
                                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                                {parseMentions(c.content)}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <p className="text-xs text-gray-400">
                                                    {new Date(
                                                        c.createdAt,
                                                    ).toLocaleDateString(
                                                        "es-AR",
                                                    )}
                                                </p>
                                                {user &&
                                                    user.id !== c.userId && (
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    if (liked) {
                                                                        await api.delete(
                                                                            `/interactions/like/${c.id}`,
                                                                        );
                                                                    } else {
                                                                        await api.post(
                                                                            `/interactions/like/${c.id}`,
                                                                        );
                                                                    }
                                                                    fetchReport();
                                                                } catch (err) {
                                                                    alert(
                                                                        err
                                                                            .response
                                                                            ?.data
                                                                            ?.message ||
                                                                            "Error",
                                                                    );
                                                                }
                                                            }}
                                                            className={`text-xs flex items-center gap-1 transition ${
                                                                liked
                                                                    ? "text-red-500"
                                                                    : "text-gray-400 hover:text-red-400"
                                                            }`}
                                                        >
                                                            ❤️{" "}
                                                            {c._count?.likes ||
                                                                0}
                                                        </button>
                                                    )}
                                                {!user && (
                                                    <span className="text-xs text-gray-300">
                                                        ❤️{" "}
                                                        {c._count?.likes || 0}
                                                    </span>
                                                )}
                                            </div>
                                            {c.media &&
                                                c.media.filter(
                                                    (m) => m.status === "APPROVED"
                                                ).length > 0 && (
                                                    <div className="flex gap-2 mt-2">
                                                        {c.media
                                                            .filter(
                                                                (m) => m.status === "APPROVED"
                                                            )
                                                            .map(
                                                                (
                                                                    m,
                                                                    idx,
                                                                    arr,
                                                                ) => (
                                                                    <button
                                                                        key={
                                                                            m.id
                                                                        }
                                                                        onClick={() =>
                                                                            openLightbox(
                                                                                arr,
                                                                                idx,
                                                                            )
                                                                        }
                                                                        className="text-left relative"
                                                                    >
                                                                        {m.type ===
                                                                        "VIDEO" ? (
                                                                            <div className="h-16 w-16 bg-gray-900 rounded-md flex items-center justify-center relative hover:opacity-90 transition">
                                                                                <video
                                                                                    src={`http://localhost:3000${m.url}`}
                                                                                    className="w-full h-full object-cover rounded-md opacity-50"
                                                                                />
                                                                                <span className="absolute text-white text-lg">
                                                                                    ▶
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <img
                                                                                src={`http://localhost:3000${m.url}`}
                                                                                alt="comentario"
                                                                                className="h-16 w-16 object-cover rounded-md hover:opacity-90 transition"
                                                                            />
                                                                        )}
                                                                    </button>
                                                                ),
                                                            )}
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {user ? (
                        <form
                            onSubmit={handleComment}
                            className="flex flex-col gap-2"
                        >
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Escribí un comentario..."
                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <label className="flex items-center justify-center px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition w-10">
                                    <span className="text-gray-500">📷</span>
                                    <input
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.webp,.mp4"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            setCommentFiles(
                                                Array.from(
                                                    e.target.files,
                                                ).slice(0, 3),
                                            );
                                        }}
                                    />
                                </label>
                                <button
                                    type="submit"
                                    disabled={
                                        submitting ||
                                        (!comment.trim() &&
                                            commentFiles.length === 0)
                                    }
                                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
                                >
                                    Enviar
                                </button>
                            </div>
                            {commentFiles.length > 0 && (
                                <p className="text-xs text-emerald-600">
                                    {commentFiles.length} imagen(es) adjuntas
                                    para el comentario
                                </p>
                            )}
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

            {/* Modal de sugerir cambios */}
            {showSuggestModal && (
                <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Sugerir cambios
                        </h2>
                        <form
                            onSubmit={handleSuggest}
                            className="flex flex-col gap-4"
                        >
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">
                                    ¿Qué querés reportar sobre este reporte?
                                </label>
                                <select
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={suggestForm.reason}
                                    onChange={(e) =>
                                        setSuggestForm({
                                            ...suggestForm,
                                            reason: e.target.value,
                                        })
                                    }
                                >
                                    <option value="STATUS_CHANGE">
                                        El problema ya se solucionó / empeoró
                                    </option>
                                    <option value="DUPLICATE">
                                        Es un reporte duplicado
                                    </option>
                                    <option value="INCORRECT_CATEGORY">
                                        La categoría es incorrecta
                                    </option>
                                    <option value="INCORRECT_LOCATION">
                                        La ubicación es incorrecta
                                    </option>
                                    <option value="INAPPROPRIATE">
                                        Contenido inapropiado / Falso
                                    </option>
                                    <option value="OTHER">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">
                                    Detalles
                                </label>
                                <textarea
                                    rows={4}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                    placeholder="Agregá más detalles para que los administradores puedan revisarlo..."
                                    value={suggestForm.message}
                                    onChange={(e) =>
                                        setSuggestForm({
                                            ...suggestForm,
                                            message: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowSuggestModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        suggesting ||
                                        !suggestForm.message.trim()
                                    }
                                    className="flex-1 px-4 py-2 bg-purple-600 rounded-lg text-sm font-medium text-white hover:bg-purple-700 transition disabled:opacity-50"
                                >
                                    {suggesting
                                        ? "Enviando..."
                                        : "Enviar sugerencia"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de subida exitosa */}
            {showUploadModal && (
                <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                            ✓
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            ¡Subida exitosa!
                        </h2>
                        <p className="text-gray-600 mb-4 inline-block mx-auto text-left">
                            La imagen se subió correctamente y está pendiente de
                            moderación.
                        </p>
                        <button
                            onClick={() => setShowUploadModal(false)}
                            className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
                        >
                            Aceptar
                        </button>
                    </div>
                </div>
            )}

            {/* Lightbox */}
            {lightboxMedia && (
                <div className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center">
                    <button
                        onClick={() => setLightboxMedia(null)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 w-10 h-10 flex items-center justify-center text-3xl font-light"
                    >
                        &times;
                    </button>
                    {lightboxMedia.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/40 px-3 py-1 rounded-full">
                            {lightboxIndex + 1} / {lightboxMedia.length}
                        </div>
                    )}
                    {lightboxMedia.length > 1 && (
                        <button
                            onClick={prevMedia}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white hover:text-gray-300 hover:bg-white/10 rounded-full transition text-3xl pb-1"
                        >
                            &#8249;
                        </button>
                    )}

                    <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
                        {lightboxMedia[lightboxIndex].type === "VIDEO" ? (
                            <video
                                src={`http://localhost:3000${lightboxMedia[lightboxIndex].url}`}
                                controls
                                autoPlay
                                className="max-w-full max-h-[90vh] rounded"
                            />
                        ) : (
                            <img
                                src={`http://localhost:3000${lightboxMedia[lightboxIndex].url}`}
                                alt="Vista ampliada"
                                className="max-w-full max-h-[90vh] object-contain rounded"
                            />
                        )}
                    </div>

                    {lightboxMedia.length > 1 && (
                        <button
                            onClick={nextMedia}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white hover:text-gray-300 hover:bg-white/10 rounded-full transition text-3xl pb-1"
                        >
                            &#8250;
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
