import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Navbar from "../components/Navbar";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSearchParams } from "react-router-dom";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const CATEGORIES = {
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

const URGENCIES = {
    LOW: "Baja",
    MEDIUM: "Media",
    HIGH: "Alta",
};

function MapClickHandler({ onMapClick }) {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng);
        },
    });
    return null;
}

export default function NewReport() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        title: "",
        description: "",
        category: "",
        urgency: "LOW",
        address: "",
        city: "",
        province: "",
    });
    const [position, setPosition] = useState(null);
    const [files, setFiles] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [searchParams] = useSearchParams();

    useEffect(() => {
        if (!authLoading && !user) navigate("/login");
    }, [user, authLoading, navigate]);

    useEffect(() => {
        const lat = searchParams.get("lat");
        const lng = searchParams.get("lng");
        if (lat && lng) {
            setPosition({ lat: parseFloat(lat), lng: parseFloat(lng) });
        }
    }, []);

    if (!user) {
        return (
            <div className="h-screen flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-gray-500 mb-4">
                            Necesitás iniciar sesión para reportar
                        </p>
                        <Link
                            to="/login"
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        >
                            Iniciar sesión
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const handleChange = (e) =>
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!position)
            return setError("Hacé click en el mapa para marcar la ubicación");
        if (!form.category) return setError("Seleccioná una categoría");

        setLoading(true);
        try {
            const res = await api.post("/reports", {
                ...form,
                latitude: position.lat,
                longitude: position.lng,
            });

            const reportId = res.data.report.id;

            if (files.length > 0) {
                const formData = new FormData();
                files.forEach((f) => formData.append("files", f));
                await api.post(`/media/report/${reportId}`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            }

            navigate(`/reports/${reportId}`);
        } catch (err) {
            setError(
                err.response?.data?.message || "Error al crear el reporte",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen flex flex-col">
            <Navbar />
            <div className="flex flex-1 overflow-hidden">
                {/* Formulario */}
                <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto p-6">
                    <h1 className="text-xl font-bold text-gray-900 mb-6">
                        Nuevo reporte
                    </h1>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-4"
                    >
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">
                                Título
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Ej: Bache en Av. San Martín"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">
                                Categoría
                            </label>
                            <select
                                name="category"
                                value={form.category}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="">
                                    Seleccioná una categoría
                                </option>
                                {Object.entries(CATEGORIES).map(([k, v]) => (
                                    <option key={k} value={k}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">
                                Urgencia
                            </label>
                            <select
                                name="urgency"
                                value={form.urgency}
                                onChange={handleChange}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {Object.entries(URGENCIES).map(([k, v]) => (
                                    <option key={k} value={k}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">
                                Descripción
                            </label>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                rows={3}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                placeholder="Describí el problema..."
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">
                                Dirección
                            </label>
                            <input
                                type="text"
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Ej: Av. San Martín 1200"
                            />
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="text-sm font-medium text-gray-700 block mb-1">
                                    Ciudad
                                </label>
                                <input
                                    type="text"
                                    name="city"
                                    value={form.city}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Escobar"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-sm font-medium text-gray-700 block mb-1">
                                    Provincia
                                </label>
                                <input
                                    type="text"
                                    name="province"
                                    value={form.province}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Buenos Aires"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">
                                Fotos (máx. 5)
                            </label>
                            <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp"
                                multiple
                                onChange={(e) =>
                                    setFiles(
                                        Array.from(e.target.files).slice(0, 5),
                                    )
                                }
                                className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                            />
                            {files.length > 0 && (
                                <p className="text-xs text-gray-400 mt-1">
                                    {files.length} archivo(s) seleccionado(s)
                                </p>
                            )}
                        </div>

                        {position ? (
                            <div className="bg-emerald-50 text-emerald-700 text-xs px-3 py-2 rounded-lg">
                                📍 Ubicación marcada: {position.lat.toFixed(5)},{" "}
                                {position.lng.toFixed(5)}
                            </div>
                        ) : (
                            <div className="bg-amber-50 text-amber-700 text-xs px-3 py-2 rounded-lg">
                                👆 Hacé click en el mapa para marcar la
                                ubicación
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
                        >
                            {loading ? "Enviando..." : "Enviar reporte"}
                        </button>
                    </form>
                </div>

                {/* Mapa */}
                <div className="flex-1">
                    <MapContainer
                        center={[-34.4198, -58.7293]}
                        zoom={13}
                        style={{ height: "100%", width: "100%" }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapClickHandler onMapClick={setPosition} />
                        {position && (
                            <Marker position={[position.lat, position.lng]} />
                        )}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
}
