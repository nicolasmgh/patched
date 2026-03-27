import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
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

export default function Profile() {
    const { user, login, logout, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("reports");
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/login");
        } else if (!authLoading && user) {
            fetchProfile();
            fetchNotifications();
        }
    }, [authLoading, user, navigate]);

    const handleVote = async (e, commentId, cVotes, voteIntent) => {
        e.preventDefault();
        try {
            const currentVoteValue = cVotes.find(v => v.userId === user?.id)?.value || 0;
            const newValue = currentVoteValue === voteIntent ? 0 : voteIntent;
            await api.post(`/interactions/vote/${commentId}`, { value: newValue });
            fetchProfile();
        } catch (err) {
            alert(err.response?.data?.message || "Error al votar");
        }
    };

    const fetchProfile = async () => {
        try {
            const res = await api.get("/users/me");
            setProfile(res.data.user);
            setForm({
                firstName: res.data.user.firstName,
                lastName: res.data.user.lastName,
                hideLastName: res.data.user.hideLastName,
                username: res.data.user.username || "",
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            const res = await api.get("/users/me/notifications");
            setNotifications(res.data.notifications);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append("firstName", form.firstName);
            formData.append("lastName", form.lastName);
            formData.append("hideLastName", form.hideLastName);
            formData.append("username", form.username);

            if (form.avatarFile) {
                formData.append("avatar", form.avatarFile);
            }
            if (form.removeAvatar) {
                formData.append("removeAvatar", "true");
            }

            const res = await api.patch("/users/me", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            setProfile((p) => ({ ...p, ...res.data.user }));
            login(res.data.user, localStorage.getItem("token"));
            setEditing(false);
            setForm((prev) => ({
                ...prev,
                avatarFile: null,
                avatarPreview: null,
            }));
        } catch (err) {
            alert(err.response?.data?.message || "Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    const handleMarkRead = async () => {
        await api.patch("/users/me/notifications/read");
        setNotifications((n) => n.map((x) => ({ ...x, read: true })));
    };

    const handleLogout = () => {
        logout();
        navigate("/");
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

    const unread = notifications.filter((n) => !n.read).length;

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />

            <div className="max-w-3xl mx-auto w-full px-4 py-8">
                {/* Header perfil */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center gap-2">
                                <div
                                    className={`relative ${editing ? "cursor-pointer group" : ""}`}
                                    onClick={() =>
                                        editing && fileInputRef.current?.click()
                                    }
                                >
                                    <UserAvatar
                                        user={{
                                            ...profile,
                                            avatarUrl: form.removeAvatar
                                                ? null
                                                : form.avatarPreview ||
                                                  profile?.avatarUrl,
                                        }}
                                        className="w-16 h-16"
                                        textClass="text-2xl"
                                    />
                                    {editing && (
                                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white text-xs font-semibold">
                                                Cambiar
                                            </span>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".jpg,.jpeg,.png,.webp"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const previewUrl =
                                                    URL.createObjectURL(file);
                                                setForm((f) => ({
                                                    ...f,
                                                    avatarFile: file,
                                                    avatarPreview: previewUrl,
                                                    removeAvatar: false,
                                                }));
                                            }
                                        }}
                                    />
                                </div>
                                {editing &&
                                    (profile?.avatarUrl ||
                                        form.avatarPreview) &&
                                    !form.removeAvatar && (
                                        <button
                                            onClick={() =>
                                                setForm((f) => ({
                                                    ...f,
                                                    removeAvatar: true,
                                                    avatarFile: null,
                                                    avatarPreview: null,
                                                }))
                                            }
                                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                                        >
                                            Eliminar foto
                                        </button>
                                    )}
                            </div>
                            <div>
                                {editing ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={form.firstName}
                                                onChange={(e) =>
                                                    setForm((f) => ({
                                                        ...f,
                                                        firstName:
                                                            e.target.value,
                                                    }))
                                                }
                                                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                placeholder="Nombre"
                                            />
                                            <input
                                                type="text"
                                                value={form.lastName}
                                                onChange={(e) =>
                                                    setForm((f) => ({
                                                        ...f,
                                                        lastName:
                                                            e.target.value,
                                                    }))
                                                }
                                                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                placeholder="Apellido"
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            value={form.username}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    username: e.target.value,
                                                }))
                                            }
                                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            placeholder="@usuario (opcional)"
                                        />
                                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.hideLastName}
                                                onChange={(e) =>
                                                    setForm((f) => ({
                                                        ...f,
                                                        hideLastName:
                                                            e.target.checked,
                                                    }))
                                                }
                                            />
                                            Ocultar apellido públicamente
                                        </label>
                                    </div>
                                ) : (
                                    <>
                                        <h1 className="text-xl font-bold text-gray-900">
                                            {profile?.firstName}{" "}
                                            {profile?.lastName}
                                        </h1>
                                        <p className="text-sm text-gray-500">
                                            {profile?.email}
                                        </p>
                                        {profile?.username && (
                                            <p className="text-sm font-medium text-emerald-600">
                                                @{profile.username}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                                                {profile?.role}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                ⭐ {profile?.reputation} pts
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {editing ? (
                                <>
                                    <button
                                        onClick={() => setEditing(false)}
                                        className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                                    >
                                        {saving ? "Guardando..." : "Guardar"}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
                                >
                                    Editar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">
                                {profile?._count?.reports}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Reportes
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">
                                {profile?._count?.confirmations}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Confirmaciones dadas
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">
                                {profile?._count?.comments}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Comentarios
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-4">
                    {[
                        { key: "reports", label: "Mis reportes" },
                        {
                            key: "notifications",
                            label: `Notificaciones${unread > 0 ? ` (${unread})` : ""}`,
                        },
                        { key: "comments", label: "Comentarios" },
                        { key: "badges", label: "Badges" },
                    ].map((t) => (
                        <button
                            key={t.key}
                            onClick={() => {
                                setTab(t.key);
                                if (t.key === "notifications" && unread > 0)
                                    handleMarkRead();
                            }}
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
                        {profile?.reports?.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                                <p className="text-gray-400 text-sm mb-3">
                                    Todavía no hiciste ningún reporte
                                </p>
                                <Link
                                    to="/new-report"
                                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                >
                                    + Crear primer reporte
                                </Link>
                            </div>
                        ) : (
                            profile?.reports?.map((r) => (
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

                {tab === "comments" && (
                    <div className="flex flex-col gap-3">
                        {profile?.comments?.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                                <p className="text-gray-400 text-sm">
                                    Todavía no comentaste nada
                                </p>
                            </div>
                        ) : (
                            profile?.comments?.map((c) => {
                                const userVote = c.votes?.find(v => v.userId === user?.id)?.value || 0;
                                const voteScore = c.votes?.reduce((acc, v) => acc + v.value, 0) || 0;
                                return (
                                <div
                                    key={c.id}
                                    className="bg-white rounded-xl border border-gray-200 p-4 hover:border-emerald-300 transition flex gap-3"
                                >
                                    <div className="flex flex-col items-center gap-1 mt-1">
                                        <button onClick={(e) => handleVote(e, c.id, c.votes || [], 1)} className={"text-xs flex items-center gap-1 transition cursor-pointer " + (userVote === 1 ? "text-emerald-500 font-bold" : "text-gray-400 hover:text-emerald-500")} >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 12a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11.5a.5.5 0 0 0 .5.5z"/></svg>
                                        </button>
                                        <span className={"text-xs font-semibold " + (voteScore > 0 ? "text-emerald-600" : voteScore < 0 ? "text-red-500" : "text-gray-500")}>{voteScore}</span>
                                        <button onClick={(e) => handleVote(e, c.id, c.votes || [], -1)} className={"text-xs flex items-center gap-1 transition cursor-pointer " + (userVote === -1 ? "text-red-500 font-bold" : "text-gray-400 hover:text-red-500")} >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 4a.5.5 0 0 1 .5.5v5.793l2.146-2.147a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L7.5 10.293V4.5A.5.5 0 0 1 8 4z"/></svg>
                                        </button>
                                    </div>
                                    <div className="flex-1">
                                        <Link to={`/reports/${c.report.id}`} className="block">
                                            <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                                                <span className="font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">Reporte • {c.report.title}</span>
                                                <span>•</span>
                                                <span>{new Date(c.createdAt).toLocaleDateString("es-AR")}</span>
                                            </div>
                                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{c.content}</p>
                                        </Link>
                                    </div>
                                </div>
                            )})
                        )}
                    </div>
                )}

                {/* Tab: Notificaciones */}
                {tab === "notifications" && (
                    <div className="flex flex-col gap-2">
                        {notifications.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                                <p className="text-gray-400 text-sm">
                                    Sin notificaciones
                                </p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => {
                                        if (n.data?.reportId) {
                                            navigate(
                                                `/reports/${n.data.reportId}`,
                                            );
                                        }
                                    }}
                                    className={`bg-white rounded-xl border px-4 py-3 text-sm ${n.data?.reportId ? "cursor-pointer hover:border-emerald-300 transition" : ""} ${
                                        n.read
                                            ? "border-gray-200 text-gray-500"
                                            : "border-emerald-200 text-gray-800 font-medium"
                                    }`}
                                >
                                    <p>{n.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {new Date(n.createdAt).toLocaleString(
                                            "es-AR",
                                            {
                                                dateStyle: "short",
                                                timeStyle: "short",
                                            },
                                        )}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Tab: Badges */}
                {tab === "badges" && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        {profile?.badges?.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center">
                                Todavía no ganaste ningún badge. ¡Empezá a
                                reportar!
                            </p>
                        ) : (
                            <div className="grid grid-cols-3 gap-4">
                                {profile?.badges?.map((ub) => (
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

                {/* Cerrar sesión */}
                <button
                    onClick={handleLogout}
                    className="w-full mt-4 text-sm text-red-500 hover:text-red-700 py-2"
                >
                    Cerrar sesión
                </button>
            </div>
        </div>
    );
}
