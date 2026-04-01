import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { MapClickHandler } from "../components/Map";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Navbar from "../components/Navbar";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { socket } from "../services/socket";

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

import UserAvatar from "../components/UserAvatar";

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
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionResults, setMentionResults] = useState([]);
    const [showMentions, setShowMentions] = useState(false);
    const inputRef = useRef(null);
    const mentionRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                mentionRef.current &&
                !mentionRef.current.contains(event.target)
            ) {
                setShowMentions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);
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

    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentText, setEditingCommentText] = useState("");

    const handleEditCommentSubmit = async (commentId) => {
        if (!editingCommentText.trim()) return;
        try {
            await api.put(`/comments/${commentId}`, {
                content: editingCommentText,
            });
            setEditingCommentId(null);
            fetchReport();
        } catch (err) {
            alert(err.response?.data?.message || "Error al editar comentario");
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("¿Estás seguro de eliminar este comentario?"))
            return;
        try {
            await api.delete(`/comments/${commentId}`);
            fetchReport();
        } catch (err) {
            alert(
                err.response?.data?.message || "Error al eliminar comentario",
            );
        }
    };

    const handleCensorComment = async (commentId) => {
        if (!window.confirm("¿Censurar este comentario permanentemente?"))
            return;
        try {
            await api.patch(`/comments/censor/${commentId}`);
            fetchReport();
        } catch (err) {
            alert(
                err.response?.data?.message || "Error al censurar comentario",
            );
        }
    };

    const [suggesting, setSuggesting] = useState(false);

    // Lightbox modal para fotos y videos
    const [lightboxMedia, setLightboxMedia] = useState(null);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [showUploadModal, setShowUploadModal] = useState(false);

    const [isEditingAdmin, setIsEditingAdmin] = useState(false);
    const [adminEditForm, setAdminEditForm] = useState({});
    const canEditAdmin =
        user && (user.role === "ADMIN" || user.role === "COLLABORATOR");

    const enableAdminEdit = () => {
        setAdminEditForm({
            title: report.title,
            description: report.description || "",
            address: report.address || "",
            latitude: report.latitude,
            longitude: report.longitude,
        });
        setIsEditingAdmin(true);
    };

    const saveAdminEdit = async () => {
        try {
            await api.patch(`/admin/reports/${id}`, adminEditForm);
            setIsEditingAdmin(false);
            fetchReport();
        } catch (err) {
            alert(
                "Error al guardar: " +
                    (err.response?.data?.message || err.message),
            );
        }
    };

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
        console.log("Conectando eventos de socket para el reporte:", id);

        const handleReportUpdate = (data) => {
            console.log("📡 EVENTO RECIBIDO: reportUpdate", data);
            if (String(data.id) === String(id)) {
                setReport((prev) => (prev ? { ...prev, ...data } : prev));
            }
        };

        const handleCommentAdded = (data) => {
            console.log("📡 EVENTO RECIBIDO: commentAdded", data);
            if (String(data.reportId) === String(id)) {
                setReport((prev) => {
                    if (!prev) return prev;
                    if (!prev.comments) prev.comments = [];
                    const exists = prev.comments.some((c) => c.id === data.id);
                    if (exists) return prev;
                    return {
                        ...prev,
                        comments: [...prev.comments, data], // Mantener coherencia visual agregándolo al final
                    };
                });
            }
        };

        socket.on("reportUpdate", handleReportUpdate);
        socket.on("commentAdded", handleCommentAdded);

        return () => {
            console.log("Desconectando eventos de socket...");
            socket.off("reportUpdate", handleReportUpdate);
            socket.off("commentAdded", handleCommentAdded);
        };
    }, [id]);

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

            // Ya no agregamos el comentario acá localmente si no tiene fotos,
            // confiamos en el socket para que lo inserte (previene llaves duplicadas).
            // Si hubiéramos actualizado localmente en el componente AND recibido el socket = 2 renders con mismo ID.
            if (commentFiles.length > 0) {
                // Si tiene imágenes por el problema de asincronía sí lo actualizamos aquí y el backend
                // emitirá de igual manera pero con nuestro chequeo de "exists" arriba se omitirá duplicado.
                setReport((r) => {
                    const exists = r.comments?.some(
                        (c) => c.id === newComment.id,
                    );
                    if (exists) {
                        return {
                            ...r,
                            comments: r.comments.map((c) =>
                                c.id === newComment.id ? newComment : c,
                            ),
                        };
                    }
                    return {
                        ...r,
                        comments: [newComment, ...r.comments],
                    };
                });
            }

            setComment("");
            setCommentFiles([]);
        } catch (err) {
            alert(err.response?.data?.message || "Error al comentar");
        } finally {
            setSubmitting(false);
        }
    };

    const fetchMentions = async (query) => {
        try {
            const res = await api.get(`/users/search?q=${query}`);
            setMentionResults(res.data.users);
            setShowMentions(res.data.users.length > 0);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCommentChange = (e) => {
        const value = e.target.value;
        setComment(value);

        const textBeforeCursor = value.slice(0, e.target.selectionStart);
        const match = textBeforeCursor.match(/@(\w*)$/);

        if (match) {
            const query = match[1];
            setMentionQuery(query);
            if (query.length >= 1) {
                fetchMentions(query);
            } else {
                setMentionResults([]);
                setShowMentions(false);
            }
        } else {
            setShowMentions(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && showMentions && mentionResults.length > 0) {
            e.preventDefault();
            insertMention(mentionResults[0].username);
        }
    };

    const insertMention = (username) => {
        const cursorPosition = inputRef.current.selectionStart;
        const textBeforeCursor = comment.slice(0, cursorPosition);
        const textAfterCursor = comment.slice(cursorPosition);
        const textBeforeMention = textBeforeCursor.replace(/@\w*$/, "");

        const newText = textBeforeMention + `@${username} ` + textAfterCursor;
        setComment(newText);
        setShowMentions(false);
        inputRef.current.focus();
    };

    const handleReplyPrompt = (username) => {
        if (!username) return;
        setComment((prev) =>
            prev ? prev + ` @${username} ` : `@${username} `,
        );
        inputRef.current?.focus();
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
        (m) => m.isBefore && m.status === "APPROVED",
    );
    const afterPhotos = report.media.filter(
        (m) => m.isAfter && m.status === "APPROVED",
    );
    const generalPhotos = report.media.filter(
        (m) => !m.isBefore && !m.isAfter && m.status === "APPROVED",
    );

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />

            <div className="max-w-4xl mx-auto w-full px-4 py-8">
                {/* Header */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 w-full">
                            {isEditingAdmin ? (
                                <input
                                    type="text"
                                    className="w-full text-2xl font-bold text-gray-900 border border-gray-300 rounded px-2 py-1 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={adminEditForm.title}
                                    onChange={(e) =>
                                        setAdminEditForm({
                                            ...adminEditForm,
                                            title: e.target.value,
                                        })
                                    }
                                />
                            ) : (
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        {report.title}
                                    </h1>
                                    {canEditAdmin && (
                                        <button
                                            onClick={enableAdminEdit}
                                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition shrink-0"
                                        >
                                            Editar (Admin)
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        {user &&
                            ["ADMIN", "COLLABORATOR"].includes(user.role) && (
                                <span
                                    className={`text-sm px-3 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[report.status]}`}
                                >
                                    {STATUS_LABELS[report.status]}
                                </span>
                            )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-4">
                        <span>
                            📍{" "}
                            {isEditingAdmin ? (
                                <input
                                    type="text"
                                    className="border border-gray-300 rounded px-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    value={adminEditForm.address}
                                    onChange={(e) =>
                                        setAdminEditForm({
                                            ...adminEditForm,
                                            address: e.target.value,
                                        })
                                    }
                                />
                            ) : (
                                report.address || report.city
                            )}
                        </span>
                        <span>🏷️ {CATEGORY_LABELS[report.category]}</span>
                        <span
                            className={`font-medium ${URGENCY_COLORS[report.urgency]}`}
                        >
                            ⚡ Urgencia {URGENCY_LABELS[report.urgency]}
                        </span>
                        <span>
                            📅{" "}
                            {new Date(report.createdAt).toLocaleString(
                                "es-AR",
                                { dateStyle: "short", timeStyle: "short" },
                            )}
                        </span>
                    </div>

                    {report.description && (
                        <p className="text-gray-600 text-sm mb-4">
                            {report.description}
                        </p>
                    )}

                    {/* Reportado por */}
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                            Reportado por
                        </span>
                        <Link
                            to={
                                user?.id === report.user?.id
                                    ? "/profile"
                                    : `/users/${report.user?.id}`
                            }
                            className="flex items-center gap-1.5 hover:bg-gray-50 rounded-full pr-2 transition cursor-pointer"
                        >
                            <UserAvatar
                                user={report.user}
                                className="w-5 h-5"
                                textClass="text-[10px]"
                            />
                            <span className="text-xs text-emerald-600 font-medium hover:underline">
                                {report.user?.firstName}{" "}
                                {report.user?.hideLastName
                                    ? ""
                                    : report.user?.lastName}
                                {report.user?.username && (
                                    <span className="text-gray-500 ml-1 font-normal">
                                        @{report.user.username}
                                    </span>
                                )}
                            </span>
                        </Link>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={handleConfirm}
                            disabled={user?.id === report.userId}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                                confirmed
                                    ? "bg-emerald-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                            ✓ Confirmar · {report._count.confirmations}
                        </button>

                        <button
                            onClick={handleFollow}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
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
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition cursor-pointer"
                        >
                            📤 Compartir
                        </button>

                        {user && (
                            <button
                                onClick={() => setShowSuggestModal(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 transition ml-auto cursor-pointer"
                            >
                                ✏️ Sugerir cambios
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Mapa */}
                    <div
                        className="bg-white rounded-2xl border border-gray-200 overflow-hidden relative group"
                        style={{ height: 250 }}
                    >
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 shadow-sm border border-gray-200 z-[1000] hover:bg-emerald-50 hover:text-emerald-700 transition flex items-center gap-2 outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            🗺️ Abrir en Maps
                        </a>
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
                                    className="w-full text-left relative aspect-square cursor-pointer"
                                >
                                    {m.type === "VIDEO" ? (
                                        <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center relative hover:opacity-90 transition">
                                            <video
                                                src={`x${import.meta.env.VITE_API_URL.replace("/api", "")}${m.url}`}
                                                className="w-full h-full object-cover rounded-lg opacity-50"
                                            />
                                            <span className="absolute text-white text-2xl drop-shadow-md">
                                                ▶
                                            </span>
                                        </div>
                                    ) : (
                                        <img
                                            src={`x${import.meta.env.VITE_API_URL.replace("/api", "")}${m.url}`}
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
                                            className="relative text-left cursor-pointer"
                                        >
                                            {m.type === "VIDEO" ? (
                                                <div className="h-24 aspect-square bg-gray-900 rounded-lg flex items-center justify-center relative hover:opacity-90 transition">
                                                    <video
                                                        src={`x${import.meta.env.VITE_API_URL.replace("/api", "")}${m.url}`}
                                                        className="w-full h-full object-cover rounded-lg opacity-50"
                                                    />
                                                    <span className="absolute text-white text-xl">
                                                        ▶
                                                    </span>
                                                </div>
                                            ) : (
                                                <img
                                                    src={`x${import.meta.env.VITE_API_URL.replace("/api", "")}${m.url}`}
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
                                            className="relative text-left cursor-pointer"
                                        >
                                            {m.type === "VIDEO" ? (
                                                <div className="h-24 aspect-square bg-gray-900 rounded-lg flex items-center justify-center relative hover:opacity-90 transition">
                                                    <video
                                                        src={`x${import.meta.env.VITE_API_URL.replace("/api", "")}${m.url}`}
                                                        className="w-full h-full object-cover rounded-lg opacity-50"
                                                    />
                                                    <span className="absolute text-white text-xl">
                                                        ▶
                                                    </span>
                                                </div>
                                            ) : (
                                                <img
                                                    src={`x${import.meta.env.VITE_API_URL.replace("/api", "")}${m.url}`}
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
                                const userVote = user
                                    ? c.votes?.find((v) => v.userId === user.id)
                                          ?.value || 0
                                    : 0;
                                const voteScore =
                                    c.votes?.reduce(
                                        (acc, v) => acc + v.value,
                                        0,
                                    ) || 0;
                                const isOwner = user?.id === c.userId;
                                const isAdminOrCollab =
                                    user?.role === "ADMIN" ||
                                    user?.role === "COLLABORATOR";
                                const isWithin5Mins =
                                    new Date() - new Date(c.createdAt) <=
                                    300000;
                                const canEditDelete = isOwner && isWithin5Mins;
                                return (
                                    <div
                                        key={c.id}
                                        id={`comment-${c.id}`}
                                        className="flex gap-3"
                                    >
                                        <div className="flex-1">
                                            <Link
                                                to={
                                                    user?.id === c.userId
                                                        ? "/profile"
                                                        : `/users/${c.user.id}`
                                                }
                                                className="flex items-center gap-2 group cursor-pointer w-fit mb-1"
                                            >
                                                <UserAvatar
                                                    user={c.user}
                                                    className="w-8 h-8"
                                                    textClass="text-sm"
                                                />
                                                <div className="text-sm font-medium text-gray-800 group-hover:text-emerald-600 transition">
                                                    {c.user.firstName}{" "}
                                                    {c.user.hideLastName
                                                        ? ""
                                                        : c.user.lastName}
                                                    {c.user.username && (
                                                        <span className="text-gray-500 ml-1 font-normal">
                                                            @{c.user.username}
                                                        </span>
                                                    )}
                                                </div>
                                            </Link>
                                            {editingCommentId === c.id ? (
                                                <div className="flex flex-col gap-2 mt-1 mb-2">
                                                    <textarea
                                                        value={
                                                            editingCommentText
                                                        }
                                                        onChange={(e) =>
                                                            setEditingCommentText(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                                        rows={2}
                                                    />
                                                    <div className="flex gap-2 justify-end">
                                                        <button
                                                            onClick={() =>
                                                                setEditingCommentId(
                                                                    null,
                                                                )
                                                            }
                                                            className="text-xs text-gray-500 hover:underline cursor-pointer"
                                                        >
                                                            Cancelar
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleEditCommentSubmit(
                                                                    c.id,
                                                                )
                                                            }
                                                            className="text-xs text-emerald-600 font-medium hover:underline cursor-pointer"
                                                        >
                                                            Guardar
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p
                                                    className={`text-sm whitespace-pre-wrap ${c.flagged ? "text-orange-700 font-medium italic" : "text-gray-600"}`}
                                                >
                                                    {c.flagged
                                                        ? c.content
                                                        : parseMentions(
                                                              c.content,
                                                          )}
                                                </p>
                                            )}
                                            {c.media &&
                                                c.media.filter(
                                                    (m) =>
                                                        m.status === "APPROVED",
                                                ).length > 0 && (
                                                    <div className="flex gap-2 mt-2">
                                                        {c.media
                                                            .filter(
                                                                (m) =>
                                                                    m.status ===
                                                                    "APPROVED",
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
                                                                        className="text-left relative cursor-pointer"
                                                                    >
                                                                        {m.type ===
                                                                        "VIDEO" ? (
                                                                            <div className="h-16 w-16 bg-gray-900 rounded-md flex items-center justify-center relative hover:opacity-90 transition">
                                                                                <video
                                                                                    src={`x${import.meta.env.VITE_API_URL.replace("/api", "")}${m.url}`}
                                                                                    className="w-full h-full object-cover rounded-md opacity-50"
                                                                                />
                                                                                <span className="absolute text-white text-lg">
                                                                                    ▶
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <img
                                                                                src={`x${import.meta.env.VITE_API_URL.replace("/api", "")}${m.url}`}
                                                                                alt="comentario"
                                                                                className="h-16 w-16 object-cover rounded-md hover:opacity-90 transition"
                                                                            />
                                                                        )}
                                                                    </button>
                                                                ),
                                                            )}
                                                    </div>
                                                )}
                                            <div className="flex items-center gap-3 mt-1">
                                                <p className="text-xs text-gray-400">
                                                    {new Date(
                                                        c.createdAt,
                                                    ).toLocaleString("es-AR", {
                                                        dateStyle: "short",
                                                        timeStyle: "short",
                                                    })}
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={async () => {
                                                            if (!user) {
                                                                if (
                                                                    window.confirm(
                                                                        "Debes iniciar sesión para votar. ¿Ir a Login?",
                                                                    )
                                                                )
                                                                    navigate(
                                                                        "/login",
                                                                    );
                                                                return;
                                                            }
                                                            try {
                                                                await api.post(
                                                                    `/interactions/vote/${c.id}`,
                                                                    {
                                                                        value:
                                                                            userVote ===
                                                                            1
                                                                                ? 0
                                                                                : 1,
                                                                    },
                                                                );
                                                                fetchReport();
                                                            } catch (err) {
                                                                alert(
                                                                    err.response
                                                                        ?.data
                                                                        ?.message ||
                                                                        "Error al votar",
                                                                );
                                                            }
                                                        }}
                                                        className={
                                                            "text-xs flex items-center gap-1 transition cursor-pointer " +
                                                            (userVote === 1
                                                                ? "text-emerald-500 font-bold"
                                                                : "text-gray-400 hover:text-emerald-500")
                                                        }
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            width="16"
                                                            height="16"
                                                            fill="currentColor"
                                                            viewBox="0 0 16 16"
                                                        >
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M8 12a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11.5a.5.5 0 0 0 .5.5z"
                                                            />
                                                        </svg>
                                                    </button>
                                                    <span
                                                        className={
                                                            "text-xs font-semibold " +
                                                            (voteScore > 0
                                                                ? "text-emerald-600"
                                                                : voteScore < 0
                                                                  ? "text-red-500"
                                                                  : "text-gray-500")
                                                        }
                                                    >
                                                        {voteScore}
                                                    </span>
                                                    <button
                                                        onClick={async () => {
                                                            if (!user) {
                                                                if (
                                                                    window.confirm(
                                                                        "Debes iniciar sesión para votar. ¿Ir a Login?",
                                                                    )
                                                                )
                                                                    navigate(
                                                                        "/login",
                                                                    );
                                                                return;
                                                            }
                                                            try {
                                                                await api.post(
                                                                    `/interactions/vote/${c.id}`,
                                                                    {
                                                                        value:
                                                                            userVote ===
                                                                            -1
                                                                                ? 0
                                                                                : -1,
                                                                    },
                                                                );
                                                                fetchReport();
                                                            } catch (err) {
                                                                alert(
                                                                    err.response
                                                                        ?.data
                                                                        ?.message ||
                                                                        "Error al votar",
                                                                );
                                                            }
                                                        }}
                                                        className={
                                                            "text-xs flex items-center gap-1 transition cursor-pointer " +
                                                            (userVote === -1
                                                                ? "text-red-500 font-bold"
                                                                : "text-gray-400 hover:text-red-500")
                                                        }
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            width="16"
                                                            height="16"
                                                            fill="currentColor"
                                                            viewBox="0 0 16 16"
                                                        >
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M8 4a.5.5 0 0 1 .5.5v5.793l2.146-2.147a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L7.5 10.293V4.5A.5.5 0 0 1 8 4z"
                                                            />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (!user) {
                                                                if (
                                                                    window.confirm(
                                                                        "Debes iniciar sesión para responder. ¿Ir a Login?",
                                                                    )
                                                                )
                                                                    navigate(
                                                                        "/login",
                                                                    );
                                                                return;
                                                            }
                                                            handleReplyPrompt(
                                                                c.user
                                                                    .username ||
                                                                    c.user
                                                                        .firstName,
                                                            );
                                                        }}
                                                        className="text-xs text-gray-400 hover:text-emerald-600 transition cursor-pointer"
                                                    >
                                                        Responder
                                                    </button>
                                                    {canEditDelete && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingCommentId(
                                                                    c.id,
                                                                );
                                                                setEditingCommentText(
                                                                    c.content ||
                                                                        "",
                                                                );
                                                            }}
                                                            className="text-xs text-gray-400 hover:text-blue-600 transition cursor-pointer"
                                                        >
                                                            Editar
                                                        </button>
                                                    )}
                                                    {(canEditDelete ||
                                                        isAdminOrCollab) && (
                                                        <button
                                                            onClick={() =>
                                                                handleDeleteComment(
                                                                    c.id,
                                                                )
                                                            }
                                                            className="text-xs text-gray-400 hover:text-red-600 transition cursor-pointer"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    )}
                                                    {isAdminOrCollab &&
                                                        !c.flagged && (
                                                            <button
                                                                onClick={() =>
                                                                    handleCensorComment(
                                                                        c.id,
                                                                    )
                                                                }
                                                                className="text-xs text-orange-400 font-bold hover:text-orange-600 transition cursor-pointer"
                                                            >
                                                                Censurar
                                                            </button>
                                                        )}
                                                </div>
                                            </div>
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
                                <div
                                    className="relative flex-1"
                                    ref={mentionRef}
                                >
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={comment}
                                        onChange={handleCommentChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Escribí un comentario..."
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                    {showMentions && (
                                        <div className="absolute bottom-full mb-1 left-0 w-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-[100]">
                                            {mentionResults.map((u) => (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    onClick={() =>
                                                        insertMention(
                                                            u.username,
                                                        )
                                                    }
                                                    className="w-full text-left px-4 py-2 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"
                                                >
                                                    <UserAvatar
                                                        user={u}
                                                        className="w-6 h-6"
                                                        textClass="text-xs"
                                                    />
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {u.firstName}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            @{u.username}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
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
                                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                >
                                    Enviar
                                </button>
                            </div>
                            {commentFiles.length > 0 && (
                                <div className="flex gap-2 items-center flex-wrap pt-2">
                                    {commentFiles.map((file, idx) => {
                                        const isVideo =
                                            file.type.startsWith("video/");
                                        const url = URL.createObjectURL(file);
                                        return (
                                            <div
                                                key={idx}
                                                className="relative w-16 h-16 rounded-md overflow-hidden bg-gray-900 border border-gray-200"
                                            >
                                                {isVideo ? (
                                                    <video
                                                        src={url}
                                                        className="w-full h-full object-cover opacity-50"
                                                    />
                                                ) : (
                                                    <img
                                                        src={url}
                                                        className="w-full h-full object-cover"
                                                        alt="preview"
                                                    />
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setCommentFiles(
                                                            commentFiles.filter(
                                                                (_, i) =>
                                                                    i !== idx,
                                                            ),
                                                        )
                                                    }
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] cursor-pointer hover:bg-red-600"
                                                    title="Eliminar"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
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
                                    Â¿Qué querés reportar sobre este reporte?
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
                            Â¡Subida exitosa!
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
                <div className="fixed inset-0 z-[10000] bg-black/95 flex flex-col items-center justify-center">
                    {/* Botón cerrar */}
                    <button
                        onClick={() => setLightboxMedia(null)}
                        className="absolute top-4 right-4 z-20 text-white hover:text-gray-300 w-10 h-10 flex items-center justify-center text-4xl font-light cursor-pointer"
                    >
                        &times;
                    </button>

                    {/* Contenedor de la Imagen/Video */}
                    <div className="relative flex-1 w-full flex items-center justify-center min-h-0 py-8">
                        {lightboxMedia.length > 1 && (
                            <button
                                onClick={prevMedia}
                                className="absolute left-2 md:left-8 z-10 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white hover:text-gray-300 hover:bg-white/10 rounded-full transition text-4xl pb-1 cursor-pointer"
                            >
                                &#8249;
                            </button>
                        )}

                        <div className="relative max-w-[90vw] max-h-full flex items-center justify-center">
                            {lightboxMedia[lightboxIndex].type === "VIDEO" ? (
                                <video
                                    src={`x${import.meta.env.VITE_API_URL.replace("/api", "")}${lightboxMedia[lightboxIndex].url}`}
                                    controls
                                    autoPlay
                                    className="max-w-full max-h-[80vh] object-contain rounded"
                                />
                            ) : (
                                <img
                                    src={`x${import.meta.env.VITE_API_URL.replace("/api", "")}${lightboxMedia[lightboxIndex].url}`}
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
                                onClick={nextMedia}
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
                                onClick={() => setLightboxMedia(null)}
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
