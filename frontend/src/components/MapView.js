// src/components/MapView.js — Leaflet Map with routes, markers, reports
import React, {
  forwardRef,
  useEffect,
  useState,
  useRef
} from "react";
import {
  MapContainer, TileLayer, Polyline, Marker, Popup,
  useMapEvents, ZoomControl, Circle, useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import CogniAssist from "./CogniAssist";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createSvgIcon(color, symbol) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:32px;height:32px;border-radius:50% 50% 50% 0;
      background:${color};border:3px solid white;
      transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
    ">
      <span style="transform:rotate(45deg);font-size:14px;line-height:1">${symbol}</span>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

// ── Waypoint icon — numbered circle ──────────────────────────────
function createWaypointIcon(index) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #6366f1;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: white;
      font-family: sans-serif;
    ">${index + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

// Vehicle icon that rotates based on bearing
function createVehicleIcon(bearing) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(${bearing}deg);
        transition: transform 0.4s ease;
        filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 64 64">
          <rect x="16" y="18" width="32" height="28" rx="6" fill="#3b82f6"/>
          <rect x="20" y="10" width="24" height="16" rx="5" fill="#2563eb"/>
          <rect x="22" y="11" width="20" height="12" rx="3" fill="#bfdbfe" opacity="0.85"/>
          <rect x="18" y="16" width="7" height="4" rx="2" fill="#fef08a"/>
          <rect x="39" y="16" width="7" height="4" rx="2" fill="#fef08a"/>
          <rect x="18" y="42" width="7" height="4" rx="2" fill="#ef4444"/>
          <rect x="39" y="42" width="7" height="4" rx="2" fill="#ef4444"/>
          <rect x="10" y="20" width="8" height="12" rx="3" fill="#1e293b"/>
          <rect x="46" y="20" width="8" height="12" rx="3" fill="#1e293b"/>
          <rect x="10" y="34" width="8" height="12" rx="3" fill="#1e293b"/>
          <rect x="46" y="34" width="8" height="12" rx="3" fill="#1e293b"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

const REPORT_ICONS = {
  pothole: createSvgIcon("#f97316", "🕳"),
  flooding: createSvgIcon("#3b82f6", "💧"),
  construction: createSvgIcon("#f59e0b", "🚧"),
  accident: createSvgIcon("#ef4444", "💥"),
  debris: createSvgIcon("#8b5cf6", "🪨"),
  other: createSvgIcon("#6b7280", "⚠"),
};

const ORIGIN_ICON = createSvgIcon("#22c55e", "●");
const DEST_ICON   = createSvgIcon("#ef4444", "■");

function routeColor(route, selected) {
  if (!selected) return "#6b7280";
  const score = route.cognimapScore?.score ?? 50;
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

const TILE_DARK  = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_LIGHT = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR = '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>';

function ClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function FitRouteBounds({ route }) {
  const map = useMap();
  const fittedRef = useRef(null);
  useEffect(() => {
    if (!route?.coordinates?.length) return;
    if (fittedRef.current === route.id) return;
    map.fitBounds(route.coordinates, { padding: [60, 60], maxZoom: 14, animate: true });
    fittedRef.current = route.id;
  }, [route, map]);
  return null;
}

function MapInner({
  origin, destination, routes, selectedRoute,
  vehiclePosition, vehicleBearing,
  reports, darkMode, onMapClick, onRouteSelect, reportMode,
  waypoints,
}) {
  // Only render waypoints that have been resolved to a real place (have lat/lng)
  const validWaypoints = (waypoints || []).filter((w) => w && w.lat && w.lng);

  return (
    <>
      <TileLayer url={darkMode ? TILE_DARK : TILE_LIGHT} attribution={ATTR} />
      <ZoomControl position="bottomright" />
      <ClickHandler onClick={onMapClick} />

      {selectedRoute && <FitRouteBounds route={selectedRoute} />}

      {/* Non-selected routes (dimmed) */}
      {routes
        .filter((r) => selectedRoute && r.id !== selectedRoute.id)
        .map((route) => (
          <Polyline
            key={`bg-${route.id}`}
            positions={route.coordinates}
            pathOptions={{ color: "#4b5563", weight: 4, opacity: 0.5, dashArray: "6,4" }}
            eventHandlers={{ click: () => onRouteSelect(route) }}
          />
        ))}

      {/* Selected route */}
      {selectedRoute && (
        <Polyline
          key={`sel-${selectedRoute.id}`}
          positions={selectedRoute.coordinates}
          pathOptions={{
            color: routeColor(selectedRoute, true),
            weight: 6,
            opacity: 0.95,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      )}

      {/* Origin marker */}
      {origin && (
        <Marker position={[origin.lat, origin.lng]} icon={ORIGIN_ICON}>
          <Popup className="cogni-popup">
            <strong>Origin</strong><br />{origin.shortName || origin.displayName}
          </Popup>
        </Marker>
      )}

      {/* Vehicle marker */}
      {vehiclePosition && (
        <Marker position={vehiclePosition} icon={createVehicleIcon(vehicleBearing)}>
          <Popup>🚗 Starting point</Popup>
        </Marker>
      )}

      {/* ── Waypoint markers ── */}
      {validWaypoints.map((wp, i) => (
        <Marker
          key={`waypoint-${i}-${wp.lat}-${wp.lng}`}
          position={[wp.lat, wp.lng]}
          icon={createWaypointIcon(i)}
        >
          <Popup className="cogni-popup">
            <strong>Stop {i + 1}</strong>
            <br />
            {wp.shortName || wp.displayName || `${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}`}
          </Popup>
        </Marker>
      ))}

      {/* Destination marker */}
      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={DEST_ICON}>
          <Popup className="cogni-popup">
            <strong>Destination</strong><br />
            {destination.shortName || destination.displayName}
          </Popup>
        </Marker>
      )}

      {/* Report markers */}
      {reports.map((report) => (
        <React.Fragment key={report.id}>
          <Marker
            position={[report.lat, report.lng]}
            icon={REPORT_ICONS[report.type] || REPORT_ICONS.other}
          >
            <Popup className="cogni-popup">
              <strong>{report.type.charAt(0).toUpperCase() + report.type.slice(1)}</strong>
              <br />
              Severity:{" "}
              <span style={{ color: report.severity === "high" ? "#ef4444" : report.severity === "medium" ? "#f97316" : "#22c55e" }}>
                {report.severity}
              </span>
              {report.description && <><br />{report.description}</>}
              <br /><small>{new Date(report.createdAt).toLocaleDateString()}</small>
            </Popup>
          </Marker>
          <Circle
            center={[report.lat, report.lng]}
            radius={80}
            pathOptions={{
              color: report.severity === "high" ? "#ef4444" : "#f97316",
              fillOpacity: 0.08,
              weight: 1,
            }}
          />
        </React.Fragment>
      ))}
    </>
  );
}

const MapView = forwardRef(function MapView(
  { center, zoom, origin, destination, routes, selectedRoute,
    vehiclePosition, vehicleBearing, reports, darkMode,
    onMapClick, onRouteSelect, reportMode, waypoints },
  ref
) {
  const [tileKey, setTileKey] = useState(darkMode ? "dark" : "light");
  useEffect(() => { setTileKey(darkMode ? "dark" : "light"); }, [darkMode]);

  return (
    <div className={`map-container ${reportMode ? "report-cursor" : ""}`}>
      <MapContainer
        ref={ref}
        center={center}
        zoom={zoom}
        zoomControl={false}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        dragging={true}
        preferCanvas={true}
        style={{ height: "100%", width: "100%", background: darkMode ? "#1a1a2e" : "#e8f4f8" }}
      >
        <MapInner
          key={tileKey}
          center={center}
          zoom={zoom}
          origin={origin}
          destination={destination}
          routes={routes}
          selectedRoute={selectedRoute}
          vehiclePosition={vehiclePosition}
          vehicleBearing={vehicleBearing}
          reports={reports}
          darkMode={darkMode}
          onMapClick={onMapClick}
          onRouteSelect={onRouteSelect}
          reportMode={reportMode}
          waypoints={waypoints}
        />
      </MapContainer>

      <div className="map-legend">
        <div className="legend-item"><span style={{ background: "#22c55e" }} />Safe Route</div>
        <div className="legend-item"><span style={{ background: "#eab308" }} />Moderate</div>
        <div className="legend-item"><span style={{ background: "#ef4444" }} />Risky Route</div>
        <div className="legend-divider" />
        <div className="legend-item"><span style={{ background: "#f97316", borderRadius: "50%" }} />Road Issue</div>
      </div>

      <CogniAssist
        selectedRoute={selectedRoute}
        origin={origin}
        destination={destination}
      />

      {reportMode && (
        <div className="report-mode-banner">
          📍 Report Mode Active — Click map to place a marker
        </div>
      )}
    </div>
  );
});

export default MapView;