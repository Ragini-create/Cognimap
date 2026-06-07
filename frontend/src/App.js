// src/App.js — Cognimap Root Application
import React, { useState, useCallback, useRef } from "react";
import MapView from "./components/MapView";
import SearchPanel from "./components/SearchPanel";
import RouteCard from "./components/RouteCard";
import ReportModal from "./components/ReportModal";
import EnvPanel from "./components/EnvPanel";
import Header from "./components/Header";
import { getRoute, getReports } from "./utils/api";
import "./App.css";

function calcBearing(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const ORS_PROFILE = {
  drive:   "driving-car",
  cycle:   "cycling-regular",
  walk:    "foot-walking",
  transit: "driving-car",
};

export default function App() {
  const [origin, setOrigin]               = useState(null);
  const [destination, setDestination]     = useState(null);
  const [waypoints, setWaypoints]         = useState([]); // array of place|null
  const [routes, setRoutes]               = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [vehiclePosition, setVehiclePosition] = useState(null);
  const [vehicleBearing, setVehicleBearing]   = useState(0);
  const [travelMode, setTravelMode]       = useState("drive");
  const [searchHistory, setSearchHistory] = useState(() =>
    JSON.parse(localStorage.getItem("searchHistory") || "[]")
  );

  const travelModeRef    = useRef("drive");
  const originRef        = useRef(null);
  const destinationRef   = useRef(null);
  const waypointsRef     = useRef([]);

  const [reports, setReports]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [reportMode, setReportMode]   = useState(false);
  const [reportModal, setReportModal] = useState(null);
  const [darkMode, setDarkMode]       = useState(true);
  const [mapCenter, setMapCenter]     = useState([20.5937, 78.9629]);
  const [mapZoom, setMapZoom]         = useState(5);
  const mapRef = useRef(null);

  const fetchRoute = useCallback(async (orig, dest, mode, wps) => {
    if (!orig || !dest) return;
    const profile = ORS_PROFILE[mode || travelModeRef.current] || "driving-car";
    console.log("Fetching route with profile:", profile);
    setLoading(true); setError(""); setRoutes([]); setSelectedRoute(null);
    setSelectedRouteIndex(0); setVehiclePosition(null);

    try {
      const data = await getRoute(orig.lat, orig.lng, dest.lat, dest.lng, { profile });
      setRoutes(data.routes);
      setSelectedRoute(data.routes[0]);
      setSelectedRouteIndex(0);

      if (data.routes[0]?.coordinates?.length >= 2) {
        const coords = data.routes[0].coordinates;
        setVehiclePosition(coords[0]);
        setVehicleBearing(calcBearing(coords[0][0], coords[0][1], coords[1][0], coords[1][1]));
      }

      const allLats = [orig.lat, dest.lat, ...(wps || []).filter(Boolean).map(w => w.lat)];
      const allLngs = [orig.lng, dest.lng, ...(wps || []).filter(Boolean).map(w => w.lng)];
      const pad = 0.05;
      const reportData = await getReports({
        minLat: Math.min(...allLats) - pad, maxLat: Math.max(...allLats) + pad,
        minLng: Math.min(...allLngs) - pad, maxLng: Math.max(...allLngs) + pad,
      });
      setReports(reportData);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to get route. Check API keys.");
    } finally {
      setLoading(false);
    }
  }, []);

const handleTravelModeChange = useCallback((mode) => {
  console.log("Travel mode changed:", mode);

  setTravelMode(mode);
  travelModeRef.current = mode;

  if (originRef.current && destinationRef.current) {
    fetchRoute(
      originRef.current,
      destinationRef.current,
      mode,
      waypointsRef.current
    );
  }
}, [fetchRoute]);

  const handleStartNavigation = useCallback(async () => {
    if (originRef.current && destinationRef.current) {
      const newSearch = {
        origin: originRef.current.displayName || originRef.current.shortName,
        destination: destinationRef.current.displayName || destinationRef.current.shortName,
      };
      const updated = [
        newSearch,
        ...searchHistory.filter(
          (i) => !(i.origin === newSearch.origin && i.destination === newSearch.destination)
        ),
      ].slice(0, 5);
      setSearchHistory(updated);
      localStorage.setItem("searchHistory", JSON.stringify(updated));
    }
    await fetchRoute(originRef.current, destinationRef.current, travelModeRef.current, waypointsRef.current);
  }, [fetchRoute, searchHistory]);

  const handleOriginSelect = useCallback((place) => {
    setOrigin(place); originRef.current = place;
    if (place) { setMapCenter([place.lat, place.lng]); setMapZoom(13); }
    if (place && destinationRef.current)
      fetchRoute(place, destinationRef.current, travelModeRef.current, waypointsRef.current);
  }, [fetchRoute]);

  const handleDestinationSelect = useCallback((place) => {
    setDestination(place); destinationRef.current = place;
    if (place) { setMapCenter([place.lat, place.lng]); setMapZoom(13); }
    if (originRef.current && place)
      fetchRoute(originRef.current, place, travelModeRef.current, waypointsRef.current);
  }, [fetchRoute]);

  const handleSwap = useCallback(() => {
    if (!originRef.current || !destinationRef.current) return;
    const o = originRef.current, d = destinationRef.current;
    setOrigin(d); setDestination(o);
    originRef.current = d; destinationRef.current = o;
    fetchRoute(d, o, travelModeRef.current, waypointsRef.current);
  }, [fetchRoute]);

  // ── Waypoints ──────────────────────────────────────────────────────────────
  const handleAddWaypoint = useCallback(() => {
    setWaypoints(prev => { const n = [...prev, null]; waypointsRef.current = n; return n; });
  }, []);

  const handleRemoveWaypoint = useCallback((index) => {
    setWaypoints(prev => {
      const n = prev.filter((_, i) => i !== index);
      waypointsRef.current = n;
      if (originRef.current && destinationRef.current)
        fetchRoute(originRef.current, destinationRef.current, travelModeRef.current, n);
      return n;
    });
  }, [fetchRoute]);

  const handleWaypointSelect = useCallback((index, place) => {
    setWaypoints(prev => {
      const n = [...prev]; n[index] = place;
      waypointsRef.current = n;
      if (originRef.current && destinationRef.current && n.every(Boolean))
        fetchRoute(originRef.current, destinationRef.current, travelModeRef.current, n);
      return n;
    });
  }, [fetchRoute]);

  // ── Route selection ────────────────────────────────────────────────────────
  const handleRouteSelect = useCallback((route, index) => {
    setSelectedRoute(route);
    setSelectedRouteIndex(index);
    if (route?.coordinates?.length >= 2) {
      setVehiclePosition(route.coordinates[0]);
      setVehicleBearing(calcBearing(
        route.coordinates[0][0], route.coordinates[0][1],
        route.coordinates[1][0], route.coordinates[1][1]
      ));
    }
  }, []);

  const handleMapClick = useCallback((lat, lng) => {
    if (reportMode) setReportModal({ lat, lng });
  }, [reportMode]);

  const handleReportSaved = useCallback((newReport) => {
    setReports(prev => [newReport, ...prev]);
    setReportModal(null); setReportMode(false);
  }, []);

  const handleHistorySelect = useCallback((_item) => {}, []);
  const handleHistoryClear  = useCallback(() => {
    setSearchHistory([]); localStorage.removeItem("searchHistory");
  }, []);

  return (
    <div className={`cognimap-root ${darkMode ? "dark" : "light"}`}>
      <Header darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} />

      <div className="cognimap-layout">
        <aside className="left-panel">
          <SearchPanel
            origin={origin}
            destination={destination}
            waypoints={waypoints}
            searchHistory={searchHistory}
            onOriginSelect={handleOriginSelect}
            onDestinationSelect={handleDestinationSelect}
            onSwap={handleSwap}
            onStartNavigation={handleStartNavigation}
            onAddWaypoint={handleAddWaypoint}
            onRemoveWaypoint={handleRemoveWaypoint}
            onWaypointSelect={handleWaypointSelect}
            onHistorySelect={handleHistorySelect}
            onHistoryClear={handleHistoryClear}
            onTravelModeChange={handleTravelModeChange}
            selectedRouteIndex={selectedRouteIndex}
            loading={loading}
          />

          {error && <div className="error-banner"><span>⚠️</span> {error}</div>}
          {loading && (
            <div className="loading-state"><div className="spinner" /><span>Analysing routes…</span></div>
          )}

          {routes.length > 0 && (
            <div className="routes-list">
              <div className="routes-header">
                <span className="routes-label">
                  {routes.length} Route{routes.length > 1 ? "s" : ""} Found
                </span>
                {routes.length > 1 && <span className="routes-sub">Tap to compare</span>}
              </div>

              {/* Route tabs for quick switching */}
              {routes.length > 1 && (
                <div className="route-tabs">
                  {routes.map((r, i) => (
                    <button
                      key={r.id}
                      className={`route-tab${selectedRoute?.id === r.id ? " active" : ""}`}
                      onClick={() => handleRouteSelect(r, i)}
                    >
                      {i === 0 ? "★ Best" : `Alt ${i}`}
                    </button>
                  ))}
                </div>
              )}

              {routes.map((route, i) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  index={i}
                  selected={selectedRoute?.id === route.id}
                  onSelect={() => handleRouteSelect(route, i)}
                />
              ))}
            </div>
          )}

          {selectedRoute && <EnvPanel route={selectedRoute} />}

          <div className="report-section">
            <button
              className={`report-btn${reportMode ? " active" : ""}`}
              onClick={() => setReportMode(r => !r)}
            >
              {reportMode ? "✕ Cancel Reporting" : "📍 Report Road Issue"}
            </button>
            {reportMode && <p className="report-hint">Click anywhere on the map to mark an issue</p>}
          </div>
        </aside>

        <main className="map-area">
          <MapView
            ref={mapRef}
            center={mapCenter} zoom={mapZoom}
            origin={origin} destination={destination}
            waypoints={waypoints.filter(Boolean)}
            routes={routes} selectedRoute={selectedRoute}
            vehiclePosition={vehiclePosition} vehicleBearing={vehicleBearing}
            reports={reports} reportMode={reportMode} darkMode={darkMode}
            onMapClick={handleMapClick} onRouteSelect={(r) => handleRouteSelect(r, routes.indexOf(r))}
          />
        </main>
      </div>

      {reportModal && (
        <ReportModal lat={reportModal.lat} lng={reportModal.lng}
          onSave={handleReportSaved} onClose={() => setReportModal(null)} />
      )}
    </div>
  );
}