import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Navbar from "../components/Navbar";
import UserAvatar from "../components/UserAvatar";

const STATUS_LABELS = {
    PENDING: "Pendiente",
    APPROVED: "Aprobado",
    IN_PROGRESS: "En progreso",
    RESOLVED: "Resuelto",
    REJECTED: "Rechazado",
    DUPLICATE: "Duplicado",
};

const VALID_TRANSITIONS = {
    PENDING: ["APPROVED", "REJECTED", "DUPLICATE"],
    APPROVED: ["IN_PROGRESS", "REJECTED"],
    IN_PROGRESS: ["RESOLVED", "REJECTED"],
    RESOLVED: [],
    REJECTED: ["PENDING"],
    DUPLICATE: ["PENDING"],
};

export default function AdminReport() {
    const { id } = useParams();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [uploadingAfter, setUploadingAfter] = useState(false);

    useEffect(() => {
        if (
            !authLoading &&
            (!user || !["ADMIN", "COLLABORATOR"].includes(user.role))
        ) {
            navigate("/");
        } else if (!authLoading && user) {
            fetchReport();
        }
    }, [id, user, authLoading, navigate]);

    const fetchReport = async () => {
        try {
            const res = await api.get(`/reports/${id}`);
            setReport(res.data.report);
        } catch {
            navigate("/admin");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (status) => {
        if (status === "REJECTED" && !details.trim()) {
            alert(
                "Debes ingresar un motivo de justificación para rechazar el reporte.",
            );
            return;
        }

        let origId = undefined;
        if (status === "DUPLICATE") {
            origId = window.prompt(
                "Ingresa el ID del reporte original/existente al que se unificará este:",
            );
            if (origId === null) return;
            if (!origId.trim()) {
                alert(
                    "Debes ingresar un ID de reporte válido para poder duplicar.",
                );
                return;
            }
            origId = origId.trim();
        }

        if (!window.confirm(`¿Cambiar estado a "${STATUS_LABELS[status]}"?`))
            return;
        setSubmitting(true);
        try {
            await api.patch(`/admin/reports/${id}/status`, {
                status,
                details,
                duplicateId: origId,
            });
            await fetchReport();
            setDetails("");
        } catch (err) {
            alert(err.response?.data?.message || "Error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUploadAfter = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        setUploadingAfter(true);
        try {
            const formData = new FormData();
            files.forEach((f) => formData.append("files", f));
            formData.append("isAfter", "true");
            await api.post(`/media/report/${id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            await fetchReport();
        } catch (err) {
            alert(err.response?.data?.message || "Error");
        } finally {
            setUploadingAfter(false);
        }
    };

    const handleDeleteMedia = async (mediaId) => {
        if (
            !window.confirm(
                "¿Estás seguro de que quieres eliminar esta imagen/video permanentemente?",
            )
        )
            return;
        try {
            await api.delete(`/media/${mediaId}`);
            await fetchReport();
        } catch (err) {
            alert(
                err.response?.data?.message || "Error al eliminar multimedia",
            );
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

    const transitions = VALID_TRANSITIONS[report.status] || [];
    const afterPhotos = report.media?.filter((m) => m.isAfter) || [];
    const generalPhotos =
        report.media?.filter((m) => !m.isBefore && !m.isAfter) || [];

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />

            <div className="max-w-3xl mx-auto w-full px-4 py-8">
                <div className="flex items-center gap-2 mb-6">
                    <Link
                        to="/admin"
                        className="text-sm text-gray-400 hover:text-gray-600"
                    >
                        ← Panel admin
                    </Link>
                    <span className="text-gray-300">/</span>
                    <span className="text-sm text-gray-600">
                        Gestionar reporte
                    </span>
                </div>

                {/* Info del reporte */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <h1 className="text-xl font-bold text-gray-900">
                            {report.title}
                        </h1>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-sm px-3 py-1 rounded-full font-medium bg-gray-100 text-gray-700 shrink-0">
                                {STATUS_LABELS[report.status]}
                            </span>
                            {report.status === "DUPLICATE" &&
                                report.duplicateId && (
                                    <Link
                                        to={`/admin/reports/${report.duplicateId}`}
                                        className="text-xs text-blue-500 hover:underline"
                                    >
                                        Ver original (
                                        {report.duplicateId.slice(0, 8)}...)
                                    </Link>
                                )}
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                        {report.description}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                        <span>📍 {report.address || report.city}</span>
                        <span>
                            📅{" "}
                            {new Date(report.createdAt).toLocaleDateString(
                                "es-AR",
                            )}
                        </span>
                        <span>
                            ✓ {report._count?.confirmations} confirmaciones
                        </span>
                        <span>💬 {report._count?.comments} comentarios</span>
                    </div>

                    {generalPhotos.length > 0 && (
                        <div className="mt-4">
                            <p className="text-xs text-gray-400 mb-2">
                                Fotos del reporte
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                {generalPhotos.map((m) => (
                                    <div key={m.id} className="relative group">
                                        <a
                                            href={`${import.meta.env.VITE_API_URL.replace("/api", "")}${m.url}`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <img
                                                src={`${m.url?.startsWith("http") ? m.url : `${import.meta.env.VITE_API_URL.replace("/api", "")}${m.url}`}`}
                                                className="h-20 w-20 object-cover rounded-lg"
                                                alt="foto"
                                            />
                                        </a>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDeleteMedia(m.id);
                                            }}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Eliminar imagen"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Fotos del después */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Fotos del después{" "}
                        {report.status === "IN_PROGRESS" && (
                            <span className="text-xs text-amber-500 ml-1">
                                (requeridas para resolver)
                            </span>
                        )}
                    </h3>
                    {afterPhotos.length > 0 ? (
                        <div className="flex gap-2 flex-wrap mb-3">
                            {afterPhotos.map((m) => (
                                <div key={m.id} className="relative group">
                                    <a
                                        href={`${import.meta.env.VITE_API_URL.replace("/api", "")}${m.url}`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <img
                                            src={`${m.url?.startsWith("http") ? m.url : `${import.meta.env.VITE_API_URL.replace("/api", "")}${m.url}`}`}
                                            className="h-20 w-20 object-cover rounded-lg"
                                            alt="después"
                                        />
                                    </a>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDeleteMedia(m.id);
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Eliminar imagen"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 mb-3">
                            Sin fotos del después todavía
                        </p>
                    )}
                    <label
                        className={`text-xs px-3 py-2 rounded-lg font-medium cursor-pointer transition ${
                            uploadingAfter
                                ? "bg-gray-100 text-gray-400"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                    >
                        {uploadingAfter
                            ? "Subiendo..."
                            : "+ Agregar foto del después"}
                        <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp"
                            multiple
                            className="hidden"
                            onChange={handleUploadAfter}
                            disabled={uploadingAfter}
                        />
                    </label>
                </div>

                {/* Cambiar estado */}
                {transitions.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            Cambiar estado
                        </h3>
                        <textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            placeholder="Motivo o notas (obligatorio para rechazar, opcional para otros estados)..."
                            rows={2}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none mb-3"
                        />
                        <div className="flex gap-2 flex-wrap">
                            {transitions.map((status) => (
                                <button
                                    key={status}
                                    onClick={() => handleStatusChange(status)}
                                    disabled={submitting}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                                        status === "REJECTED"
                                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                                            : status === "RESOLVED"
                                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                              : status === "DUPLICATE"
                                                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                    }`}
                                >
                                    → {STATUS_LABELS[status]}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Comentarios */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">
                        Comentarios · {report._count?.comments}
                    </h3>
                    <div className="flex flex-col gap-3">
                        {report.comments?.length === 0 ? (
                            <p className="text-sm text-gray-400">
                                Sin comentarios
                            </p>
                        ) : (
                            report.comments?.map((c) => (
                                <div
                                    key={c.id}
                                    className={`flex gap-3 p-3 rounded-xl ${c.flagged ? "bg-red-50 border border-red-100" : "bg-gray-50"}`}
                                >
                                    <UserAvatar
                                        user={c.user}
                                        className="w-7 h-7 text-xs"
                                    />
                                    <div className="flex-1">
                                        <p className="text-xs font-medium text-gray-700">
                                            {c.user?.firstName}{" "}
                                            {c.user?.lastName}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            {c.content}
                                        </p>
                                        {c.flagged && (
                                            <span className="text-xs text-red-500 font-medium">
                                                ⚠️ Flaggeado
                                            </span>
                                        )}
                                    </div>
                                    {!c.flagged && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await api.patch(
                                                        `/comments/flag/${c.id}`,
                                                    );
                                                    fetchReport();
                                                } catch (err) {
                                                    alert(
                                                        err.response?.data
                                                            ?.message ||
                                                            "Error",
                                                    );
                                                }
                                            }}
                                            className="text-xs text-gray-400 hover:text-red-500 transition shrink-0"
                                        >
                                            Flag
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
