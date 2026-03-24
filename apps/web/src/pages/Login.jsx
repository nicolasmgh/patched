import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [isBanned, setIsBanned] = useState(false);
    const [appealStatus, setAppealStatus] = useState(null);
    const [appealMessage, setAppealMessage] = useState("");
    const [appealSent, setAppealSent] = useState(false);

    const handleChange = (e) =>
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsBanned(false);
        setAppealStatus(null);
        setAppealSent(false);
        setLoading(true);
        try {
            const res = await api.post("/auth/login", form);
            login(res.data.user, res.data.token);
            navigate("/");
        } catch (err) {
            if (err.response?.status === 403) {
                setIsBanned(true);
                if (err.response?.data?.appealStatus) {
                    setAppealStatus(err.response.data.appealStatus);
                }
            }
            setError(err.response?.data?.message || "Error al iniciar sesión");
        } finally {
            setLoading(false);
        }
    };

    const handleAppeal = async () => {
        if (!appealMessage.trim()) return;
        setLoading(true);
        try {
            await api.post("/auth/appeal", {
                email: form.email,
                message: appealMessage,
            });
            setAppealSent(true);
        } catch (err) {
            console.error("Error al enviar apelación:", err);
            alert(err.response?.data?.message || "Error al enviar apelación");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8">
                <Link
                    to="/"
                    className="text-xl font-bold text-emerald-600 tracking-tight block mb-8"
                >
                    🗺️ UrbanPatch
                </Link>

                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    Iniciar sesión
                </h1>
                <p className="text-sm text-gray-500 mb-6">
                    Bienvenido de vuelta
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
                        {error}
                        {isBanned &&
                            !appealSent &&
                            (!appealStatus || appealStatus === "APPLIED") && (
                                <div className="mt-3">
                                    <p className="font-semibold mb-2">
                                        ¿Creés que es un error? Apelá tu
                                        suspensión:
                                    </p>
                                    <textarea
                                        value={appealMessage}
                                        onChange={(e) =>
                                            setAppealMessage(e.target.value)
                                        }
                                        placeholder="Explicá brevemente por qué tu cuenta debería ser reactivada..."
                                        className="w-full border border-red-200 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-2"
                                        rows="3"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAppeal}
                                        disabled={
                                            loading || !appealMessage.trim()
                                        }
                                        className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                                    >
                                        Enviar apelación
                                    </button>
                                </div>
                            )}
                        {isBanned &&
                            (appealSent ||
                                appealStatus === "PENDING" ||
                                appealStatus === "REVIEWED") && (
                                <div className="mt-3 text-amber-600 font-semibold bg-amber-50 p-2 rounded border border-amber-200">
                                    ⏳ Ya tenés una apelación en revisión. Te
                                    notificaremos si es aprobada.
                                </div>
                            )}
                        {isBanned && appealStatus === "REJECTED" && (
                            <div className="mt-3 text-red-700 font-semibold bg-red-100 p-2 rounded border border-red-300">
                                ❌ Tu apelación anterior fue denegada. La
                                decisión es definitiva.
                            </div>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="tu@email.com"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50 mt-2"
                    >
                        {loading ? "Ingresando..." : "Ingresar"}
                    </button>
                </form>

                <p className="text-sm text-gray-500 text-center mt-6">
                    ¿No tenés cuenta?{" "}
                    <Link
                        to="/register"
                        className="text-emerald-600 font-medium hover:underline"
                    >
                        Registrate
                    </Link>
                </p>
            </div>
        </div>
    );
}
