import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMapEvents,
    useMap,
    ZoomControl,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Link } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const CATEGORY_COLORS = {
    POTHOLE: "#ef4444",
    SIDEWALK: "#f97316",
    STREET_LIGHTING: "#eab308",
    ROAD_DAMAGE: "#dc2626",
    WASTE_MANAGEMENT: "#84cc16",
    STORM_DRAINAGE: "#06b6d4",
    WATER_SANITATION: "#3b82f6",
    POWER_GRID: "#8b5cf6",
    TRAFFIC: "#f59e0b",
    PUBLIC_SAFETY: "#ec4899",
    URBAN_PLANNING: "#6366f1",
    GREEN_SPACES: "#22c55e",
    OTHER: "#6b7280",
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

const STATUS_LABELS = {
    PENDING: "Pendiente",
    APPROVED: "Aprobado",
    IN_PROGRESS: "En progreso",
    RESOLVED: "Resuelto",
    REJECTED: "Rechazado",
    DUPLICATE: "Duplicado",
};

const createPinIcon = (color, isSelected = false) => {
    const scale = isSelected ? 1.3 : 1;
    return L.divIcon({
        className: "custom-leaflet-pin",
        html: `
            <div style="
                position: relative; width: 25px; height: 41px; 
                transform: scale(${scale}); transform-origin: bottom center; 
                transition: transform 0.2s ease;
            ">
                <img src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png" 
                     style="position: absolute; top: 0; left: -6px; width: 41px; height: 41px; opacity: ${isSelected ? 0.7 : 0.4};" />
                <svg viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg" width="25" height="41" style="position: absolute; top: 0; left: 0;">
                    <path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 8.25 12.5 28.5 12.5 28.5s12.5-20.25 12.5-28.5C25 5.596 19.404 0 12.5 0z"
                          fill="${color}" stroke="white" stroke-width="${isSelected ? 2 : 1.5}" />
                    <circle cx="12.5" cy="12.5" r="4" fill="white" />
                    ${isSelected ? `<circle cx="12.5" cy="12.5" r="2" fill="${color}" />` : ""}
                </svg>
            </div>
        `,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [0, -34],
    });
};

const createClusterCustomIcon = function (cluster) {
    return L.divIcon({
        html: `<div class="bg-emerald-600 text-white rounded-full h-10 w-10 flex items-center justify-center font-bold shadow-lg border-2 border-white">${cluster.getChildCount()}</div>`,
        className: "custom-marker-cluster",
        iconSize: L.point(40, 40, true),
    });
};

export function MapClickHandler({ onMapClick }) {
    useMapEvents({
        click(e) {
            if (onMapClick) onMapClick(e.latlng);
        },
    });
    return null;
}

export function MapBoundsTracker({ onBoundsChange }) {
    const map = useMap();

    useMapEvents({
        moveend() {
            onBoundsChange(map.getBounds());
        },
        zoomend() {
            onBoundsChange(map.getBounds());
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
    onReportClick = null,
    onBoundsChange = null,
    suggestReport = false,
    onMarkerDragEnd = null,
    selectedReportId = null,
}) {
    return (
        <MapContainer
            center={center}
            zoom={13}
            style={{ height, width: "100%" }}
            zoomControl={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <ZoomControl position="bottomright" />

            {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
            {onBoundsChange && (
                <MapBoundsTracker onBoundsChange={onBoundsChange} />
            )}

            <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={60}
                showCoverageOnHover={false}
                iconCreateFunction={createClusterCustomIcon}
            >
                {reports.map((report) => {
                    const isSelected = selectedReportId === report.id;
                    return (
                        <Marker
                            key={report.id}
                            position={[report.latitude, report.longitude]}
                            zIndexOffset={isSelected ? 1000 : 0}
                            icon={createPinIcon(
                                CATEGORY_COLORS[report.category] || "#6b7280",
                                isSelected,
                            )}
                            eventHandlers={{
                                click: () =>
                                    onReportClick && onReportClick(report),
                                mouseover: (e) => {
                                    if (!isSelected) e.target.openPopup();
                                },
                                mouseout: (e) => {
                                    if (!isSelected) e.target.closePopup();
                                },
                            }}
                        >
                            <Popup>
                                <div className="text-sm min-w-[160px]">
                                    <div
                                        className="w-full h-1.5 rounded-full mb-2"
                                        style={{
                                            background:
                                                CATEGORY_COLORS[
                                                    report.category
                                                ],
                                        }}
                                    />
                                    <p className="font-semibold text-gray-800 leading-tight">
                                        {report.title}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {report.address || report.city}
                                    </p>
                                    <p className="text-xs mt-1 text-gray-500">
                                        {CATEGORY_LABELS[report.category]} ·{" "}
                                        {STATUS_LABELS[report.status]}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                        <span>
                                            ✓ {report._count?.confirmations}
                                        </span>
                                        <span>
                                            💬 {report._count?.comments}
                                        </span>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MarkerClusterGroup>

            {selectedPosition && (
                <Marker
                    position={[selectedPosition.lat, selectedPosition.lng]}
                    icon={createPinIcon("#3b82f6", true)}
                    draggable={true}
                    zIndexOffset={2000}
                    eventHandlers={{
                        dragend: (e) => {
                            if (onMarkerDragEnd) {
                                const marker = e.target;
                                const position = marker.getLatLng();
                                onMarkerDragEnd(position);
                            }
                        },
                    }}
                />
            )}
        </MapContainer>
    );
}
