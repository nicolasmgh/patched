import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Map from "../components/Map";
import api from "../services/api";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const CATEGORY_LABELS = {
    POTHOLE: "Bache",
    SIDEWALK: "Vereda",
    STREET_LIGHTING: "Luminaria",
    ROAD_DAMAGE: "Calzada",
    WASTE_MANAGEMENT: "Basura",
    STORM_DRAINAGE: "Desagüe",
    WATER_SANITATION: "Cloacas",
    POWER_GRID: "Luz",
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

export default function Home() {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        category: "",
        status: "",
        city: "",
    });

    const getUserCenter = () => {
        // Coordenadas aproximadas por ciudad — se puede mejorar con geocoding
        return [-34.4198, -58.7293]; // Por ahora Escobar default, luego geocoding
    };

    useEffect(() => {
        fetchReports();
    }, [filters]);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const params = Object.fromEntries(
                Object.entries(filters).filter(([, v]) => v),
            );
            const res = await api.get("/reports", { params });
            setReports(res.data.reports);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen flex flex-col">
            <Navbar />

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
                    {/* Filtros */}
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-700 mb-3">
                            Filtros
                        </h2>
                        <div className="flex flex-col gap-2">
                            <select
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={filters.category}
                                onChange={(e) =>
                                    setFilters((f) => ({
                                        ...f,
                                        category: e.target.value,
                                    }))
                                }
                            >
                                <option value="">Todas las categorías</option>
                                {Object.entries(CATEGORY_LABELS).map(
                                    ([k, v]) => (
                                        <option key={k} value={k}>
                                            {v}
                                        </option>
                                    ),
                                )}
                            </select>

                            <select
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={filters.status}
                                onChange={(e) =>
                                    setFilters((f) => ({
                                        ...f,
                                        status: e.target.value,
                                    }))
                                }
                            >
                                <option value="">Todos los estados</option>
                                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>
                                        {v}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="text"
                                placeholder="Ciudad..."
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={filters.city}
                                onChange={(e) =>
                                    setFilters((f) => ({
                                        ...f,
                                        city: e.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>

                    {/* Lista de reportes */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-sm text-gray-400 text-center">
                                Cargando...
                            </div>
                        ) : reports.length === 0 ? (
                            <div className="p-4 text-sm text-gray-400 text-center">
                                No hay reportes
                            </div>
                        ) : (
                            reports.map((report) => (
                                <Link
                                    key={report.id}
                                    to={`/reports/${report.id}`}
                                    className="block p-4 border-b border-gray-100 hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-medium text-gray-800 leading-tight">
                                            {report.title}
                                        </p>
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[report.status]}`}
                                        >
                                            {STATUS_LABELS[report.status]}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {report.address || report.city}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-gray-400">
                                            {CATEGORY_LABELS[report.category]}
                                        </span>
                                        <span className="text-xs text-gray-300">
                                            ·
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {report._count?.confirmations}{" "}
                                            confirmaciones
                                        </span>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* Mapa */}
                <div className="flex-1">
                    <Map reports={reports} />
                </div>
            </div>
        </div>
    );
}
