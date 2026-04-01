import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { socket } from "../services/socket";

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [showNotif, setShowNotif] = useState(false);
    const [hasSeenNotifs, setHasSeenNotifs] = useState(false);
    const dropRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const res = await api.get("/users/me/notifications");
            setNotifications(res.data.notifications);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();

            const handleNewNotification = (data) => {
                console.log(
                    "🔔 EVENTO RECIBIDO EN NAVBAR: newNotification",
                    data,
                );
                if (data.userId === user.id) {
                    console.log(
                        "🔔 Coincide el usuario. Actualizando notificaciones...",
                    );
                    setNotifications((prev) => [data, ...prev]);
                    setHasSeenNotifs(false);
                } else {
                    console.log(
                        "🔔 No es para este usuario. Yo soy",
                        user.id,
                        "y es para",
                        data.userId,
                    );
                }
            };

            const handleNotificationsRead = (data) => {
                console.log(
                    "🔔 EVENTO RECIBIDO EN NAVBAR: notificationsRead",
                    data,
                );
                if (data.userId === user.id) {
                    setNotifications((n) =>
                        n.map((x) => ({ ...x, read: true })),
                    );
                }
            };

            socket.on("newNotification", handleNewNotification);
            socket.on("notificationsRead", handleNotificationsRead);

            return () => {
                socket.off("newNotification", handleNewNotification);
                socket.off("notificationsRead", handleNotificationsRead);
            };
        }
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropRef.current && !dropRef.current.contains(event.target)) {
                setShowNotif(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMarkRead = async () => {
        try {
            await api.patch("/users/me/notifications/read");
            setNotifications((n) => n.map((x) => ({ ...x, read: true })));
            setHasSeenNotifs(true);
        } catch (err) {}
    };

    const handleNotificationClick = async (n) => {
        if (!n.read) {
            try {
                await api.patch(`/users/me/notifications/${n.id}/read`);
                setNotifications((prev) =>
                    prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
                );
            } catch (err) {
                console.error("Error marking notification as read:", err);
            }
        }

        if (
            n.data?.reportId &&
            n.data?.status !== "REJECTED" &&
            n.type !== "REPORT_REJECTED"
        ) {
            let hash = "";
            if (n.data?.commentId) hash = `#comment-${n.data.commentId}`;
            
            // if admin/collab and it's a pending moderation notification, go to admin panel
            if (
                ["ADMIN", "COLLABORATOR"].includes(user?.role) && 
                n.data?.status === "PENDING"
            ) {
                navigate(`/admin/reports/${n.data.reportId}`);
            } else {
                navigate(`/reports/${n.data.reportId}${hash}`);
            }
            setShowNotif(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm relative z-[9999]">
            <Link
                to="/"
                className="text-xl font-bold text-emerald-600 tracking-tight"
            >
                🗺️ Patched
            </Link>

            <div className="flex items-center gap-4">
                {user && ["ADMIN", "COLLABORATOR"].includes(user.role) && (
                    <Link
                        to="/admin"
                        className="text-sm text-gray-600 hover:text-gray-900"
                    >
                        Admin
                    </Link>
                )}

                <Link
                    to="/stats"
                    className="text-sm text-gray-600 hover:text-gray-900"
                >
                    Estadísticas
                </Link>

                {user ? (
                    <>
                        <div className="relative" ref={dropRef}>
                            <button
                                onClick={() => {
                                    setShowNotif(!showNotif);
                                    if (!showNotif) {
                                        setHasSeenNotifs(true);
                                        handleMarkRead();
                                    }
                                }}
                                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition cursor-pointer"
                            >
                                🔔
                                {unreadCount > 0 && !hasSeenNotifs && (
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                                )}
                            </button>

                            {showNotif && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                                    <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
                                        <h3 className="font-semibold text-gray-800 text-sm">
                                            Notificaciones
                                        </h3>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-gray-500">
                                                No tienes notificaciones
                                            </div>
                                        ) : (
                                            notifications.map((n) => (
                                                <div
                                                    key={n.id}
                                                    className={`p-3 border-b border-gray-100 text-sm cursor-pointer hover:bg-gray-50 transition ${
                                                        n.read
                                                            ? "bg-white"
                                                            : "bg-emerald-50/50"
                                                    }`}
                                                    onClick={() =>
                                                        handleNotificationClick(
                                                            n,
                                                        )
                                                    }
                                                >
                                                    <p className="text-gray-800">
                                                        {n.message}
                                                    </p>
                                                    {n.data?.preview && (
                                                        <p className="text-xs text-gray-500 mt-1 italic border-l-2 border-gray-300 pl-2">
                                                            "{n.data.preview}"
                                                        </p>
                                                    )}
                                                    <span className="text-xs text-gray-400 mt-1 block">
                                                        {new Date(
                                                            n.createdAt,
                                                        ).toLocaleString(
                                                            undefined,
                                                            {
                                                                dateStyle:
                                                                    "short",
                                                                timeStyle:
                                                                    "short",
                                                            },
                                                        )}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <Link
                                        to="/profile"
                                        onClick={() => setShowNotif(false)}
                                        className="block p-2 text-center text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition border-t border-gray-100"
                                    >
                                        Ver en mi perfil
                                    </Link>
                                </div>
                            )}
                        </div>

                        <Link
                            to="/new-report"
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
                        >
                            + Reportar
                        </Link>
                        <Link
                            to="/profile"
                            className="text-sm text-gray-600 hover:text-gray-900"
                        >
                            {user.firstName}
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="text-sm text-red-500 hover:text-red-700 cursor-pointer"
                        >
                            Salir
                        </button>
                    </>
                ) : (
                    <>
                        <Link
                            to="/login"
                            className="text-sm text-gray-600 hover:text-gray-900"
                        >
                            Iniciar sesión
                        </Link>
                        <Link
                            to="/register"
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
                        >
                            Registrarse
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
}
