import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
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

                {user ? (
                    <>
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
