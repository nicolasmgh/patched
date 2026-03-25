import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import api from "../services/api";

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [showNotif, setShowNotif] = useState(false);
    const dropRef = useRef(null);

    useEffect(() => {
        if (user) {
            fetchNotifications();
        }
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropRef.current && !dropRef.current.contains(event.target)) {
                setShowNotif(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await api.get("/users/me/notifications");
            setNotifications(res.data.notifications);
        } catch (err) {
            console.error(err);
        }
    };

    const handleMarkRead = async () => {
        try {
            await api.patch("/users/me/notifications/read");
            setNotifications((n) => n.map((x) => ({ ...x, read: true })));
        } catch (err) {}
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
                🗺️ UrbanPatch
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
                                onClick={() => setShowNotif(!showNotif)}
                                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition"
                            >
                                🔔
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                                )}
                            </button>

                            {showNotif && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                                    <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
                                        <h3 className="font-semibold text-gray-800 text-sm">Notificaciones</h3>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={handleMarkRead}
                                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                            >
                                                Marcar leídas
                                            </button>
                                        )}
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
                                                        n.read ? "bg-white" : "bg-emerald-50/50"
                                                    }`}
                                                    onClick={() => {
                                                        if (n.data?.reportId) {
                                                            navigate(`/reports/${n.data.reportId}`);
                                                            setShowNotif(false);
                                                        }
                                                    }}
                                                >
                                                    <p className="text-gray-800">{n.message}</p>
                                                    <span className="text-xs text-gray-400 mt-1 block">
                                                        {new Date(n.createdAt).toLocaleString(undefined, { 
                                                            dateStyle: "short", 
                                                            timeStyle: "short" 
                                                        })}
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
                            className="text-sm text-red-500 hover:text-red-700"
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
