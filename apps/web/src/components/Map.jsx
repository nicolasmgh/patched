import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMapEvents,
} from "react-leaflet";
import { Link } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix icono default de Leaflet con Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const STATUS_COLORS = {
    PENDING: "#f59e0b",
    APPROVED: "#3b82f6",
    IN_PROGRESS: "#8b5cf6",
    RESOLVED: "#10b981",
    REJECTED: "#ef4444",
    DUPLICATE: "#6b7280",
};

const createColoredIcon = (color) =>
    L.divIcon({
        className: "",
        html: `<div style="
    width: 14px; height: 14px;
    background: ${color};
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
    });

// Hook para capturar click en el mapa (usado en NewReport)
export function MapClickHandler({ onMapClick }) {
    useMapEvents({
        click(e) {
            if (onMapClick) onMapClick(e.latlng);
        },
    });
    return null;
}

export default function Map({
    reports = [],
    onMapClick = null,
    selectedPosition = null,
    height = "100%",
    center = [-34.4198, -58.7293],
}) {
    return (
        <MapContainer
            center={center}
            zoom={13}
            style={{ height, width: "100%" }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

            {reports.map((report) => (
                <Marker
                    key={report.id}
                    position={[report.latitude, report.longitude]}
                    icon={createColoredIcon(
                        STATUS_COLORS[report.status] || "#6b7280",
                    )}
                >
                    <Popup>
                        <div className="text-sm">
                            <p className="font-semibold">{report.title}</p>
                            <p className="text-gray-500">
                                {report.address || report.city}
                            </p>
                            <p className="text-xs mt-1">
                                {report.category} · {report.status}
                            </p>
                            <Link
                                to={`/reports/${report.id}`}
                                className="text-emerald-600 text-xs font-medium mt-1 block"
                            >
                                Ver detalle →
                            </Link>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {selectedPosition && (
                <Marker
                    position={[selectedPosition.lat, selectedPosition.lng]}
                />
            )}
        </MapContainer>
    );
}
