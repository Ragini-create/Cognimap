// src/components/SearchPanel.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import { geocode, reverseGeocode } from "../utils/api";
import { useDebounce } from "../hooks/useDebounce";

function loadFavorites() {
  try { return JSON.parse(localStorage.getItem("cognimap_favorites")) || []; }
  catch { return []; }
}
function saveFavorites(favs) {
  localStorage.setItem("cognimap_favorites", JSON.stringify(favs));
}

const TRAVEL_MODES = [
  { id: "drive",   label: "Drive",   icon: "🚗" },
  { id: "cycle",   label: "Cycle",   icon: "🚲" },
  { id: "walk",    label: "Walk",    icon: "🚶" },
  { id: "transit", label: "Transit", icon: "🚌" },
];

function buildShareURL(origin, destination, routeIndex = 0) {
  const url = new URL(window.location.href.split("?")[0]);
  if (origin?.lat)            url.searchParams.set("olat",  origin.lat.toFixed(6));
  if (origin?.lng)            url.searchParams.set("olng",  origin.lng.toFixed(6));
  if (origin?.shortName)      url.searchParams.set("oname", origin.shortName);
  if (destination?.lat)       url.searchParams.set("dlat",  destination.lat.toFixed(6));
  if (destination?.lng)       url.searchParams.set("dlng",  destination.lng.toFixed(6));
  if (destination?.shortName) url.searchParams.set("dname", destination.shortName);
  url.searchParams.set("r", routeIndex);
  return url.toString();
}

function ShareButton({ origin, destination, selectedRouteIndex = 0 }) {
  const [copied, setCopied] = useState(false);
  const canShare = origin?.lat && destination?.lat;

  const handleCopy = async () => {
    if (!canShare) return;
    const url = buildShareURL(origin, destination, selectedRouteIndex);
    try { await navigator.clipboard.writeText(url); }
    catch {
      const el = document.createElement("input");
      el.value = url; document.body.appendChild(el);
      el.select(); document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      className={`share-route-btn${copied ? " copied" : ""}${!canShare ? " disabled" : ""}`}
      onClick={handleCopy}
      disabled={!canShare}
      title={canShare ? "Copy shareable link" : "Set origin and destination first"}
    >
      {copied ? "✓ Copied!" : "🔗 Share"}
    </button>
  );
}

// ── PlaceInput ─────────────────────────────────────────────────────────────
function PlaceInput({ label, value, onSelect, placeholder, favorites, onToggleFavorite, dotColor, onClear }) {
  const [query, setQuery]     = useState(value?.shortName || value?.displayName || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const debouncedQ = useDebounce(query, 450);
  const inputRef   = useRef(null);

  useEffect(() => {
    if (value) setQuery(value.shortName || value.displayName || "");
    else setQuery("");
  }, [value]);

  useEffect(() => {
    if (!debouncedQ || debouncedQ.length < 3 || !focused) { setResults([]); return; }
    setLoading(true);
    geocode(debouncedQ)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQ, focused]);

  const handleSelect = (place) => {
    setQuery(place.shortName || place.displayName.split(",")[0]);
    setResults([]);
    onSelect(place);
    inputRef.current?.blur();
  };

  const isFav = (place) => favorites.some((f) => f.placeId === place.placeId);

  return (
    <div className="place-input-wrap">
      <label className="place-label">
        <span className="place-dot" style={{ background: dotColor }} />
        {label}
      </label>
      <div className="place-input-inner">
        <input
          ref={inputRef}
          className="place-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {loading && <div className="input-spinner" />}
        {value && !loading && (
          <button className="input-clear-btn" onClick={() => { setQuery(""); onClear?.(); }} title="Clear">✕</button>
        )}
      </div>
      {results.length > 0 && focused && (
        <ul className="autocomplete-list">
          {results.map((r) => (
            <li key={r.placeId} className="autocomplete-item" onMouseDown={() => handleSelect(r)}>
              <span className="ac-icon">📍</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ac-name">{r.shortName}</div>
                <div className="ac-addr">{r.displayName.split(",").slice(1, 3).join(",").trim()}</div>
              </div>
              <button
                className={`fav-star-btn${isFav(r) ? " starred" : ""}`}
                onMouseDown={(e) => { e.stopPropagation(); onToggleFavorite(r); }}
                title={isFav(r) ? "Remove from favorites" : "Save to favorites"}
              >
                {isFav(r) ? "★" : "☆"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── WaypointInput — lightweight, no favorites ──────────────────────────────
function WaypointInput({ index, value, onSelect, onRemove }) {
  const [query, setQuery]     = useState(value?.shortName || value?.displayName || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const debouncedQ = useDebounce(query, 450);
  const inputRef   = useRef(null);

  useEffect(() => {
    if (value) setQuery(value.shortName || value.displayName || "");
    else setQuery("");
  }, [value]);

  useEffect(() => {
    if (!debouncedQ || debouncedQ.length < 3 || !focused) { setResults([]); return; }
    setLoading(true);
    geocode(debouncedQ)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQ, focused]);

  const handleSelect = (place) => {
    setQuery(place.shortName || place.displayName.split(",")[0]);
    setResults([]);
    onSelect(place);
    inputRef.current?.blur();
  };

  return (
    <div className="waypoint-row">
      <div className="place-input-wrap" style={{ flex: 1, marginBottom: 0 }}>
        <label className="place-label">
          <span className="place-dot" style={{ background: "#6366f1" }} />
          Stop {index + 1}
        </label>
        <div className="place-input-inner">
          <input
            ref={inputRef}
            className="place-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder={`Search stop ${index + 1}…`}
            autoComplete="off"
          />
          {loading && <div className="input-spinner" />}
        </div>
        {results.length > 0 && focused && (
          <ul className="autocomplete-list">
            {results.map((r) => (
              <li key={r.placeId} className="autocomplete-item" onMouseDown={() => handleSelect(r)}>
                <span className="ac-icon">📍</span>
                <div>
                  <div className="ac-name">{r.shortName}</div>
                  <div className="ac-addr">{r.displayName.split(",").slice(1, 3).join(",").trim()}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button className="waypoint-remove-btn" onClick={onRemove} title="Remove stop">✕</button>
    </div>
  );
}

// ── MyLocationButton ───────────────────────────────────────────────────────
function MyLocationButton({ onLocate }) {
  const [locating, setLocating] = useState(false);
  const [error, setError]       = useState("");

  const handleClick = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported"); return; }
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const place = await reverseGeocode(latitude, longitude);
          onLocate({ ...place, lat: latitude, lng: longitude });
        } catch {
          onLocate({ displayName: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, shortName: "My Location", lat: latitude, lng: longitude });
        } finally { setLocating(false); }
      },
      (err) => {
        setLocating(false);
        setError(err.code === 1 ? "Location access denied" : err.code === 2 ? "Location unavailable" : "Could not get location");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  return (
    <div>
      <button className="my-location-btn" onClick={handleClick} disabled={locating}>
        {locating ? <><span className="loc-spinner" />Locating…</> : <>📍 Use My Location</>}
      </button>
      {error && <p className="loc-error">{error}</p>}
    </div>
  );
}

// ── TravelModeSelector ─────────────────────────────────────────────────────
function TravelModeSelector({ value, onChange }) {
  return (
    <div className="travel-mode-row">
      {TRAVEL_MODES.map((mode) => (
        <button
          key={mode.id}
          className={`travel-mode-btn${value === mode.id ? " active" : ""}`}
          onClick={() => onChange(mode.id)}
          title={mode.label}
        >
          <span className="travel-mode-icon">{mode.icon}</span>
          <span className="travel-mode-label">{mode.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── FavoritesPanel ─────────────────────────────────────────────────────────
function FavoritesPanel({ favorites, onSelect, onRemove }) {
  const [visible, setVisible] = useState(false);
  if (!favorites.length) return null;
  return (
    <div className="favorites-wrapper">
      <button className="favorites-toggle" onClick={() => setVisible(v => !v)}>
        <span className="fav-toggle-left">
          <span className="fav-toggle-icon">★</span>
          Saved Places
          <span className="rs-badge">{favorites.length}</span>
        </span>
        <span style={{ transition: "transform 0.2s", display: "inline-block", transform: visible ? "rotate(180deg)" : "none" }}>▾</span>
      </button>
      {visible && (
        <div className="favorites-card">
          <div className="rs-card-header">
            <span className="rs-card-title">Saved Places</span>
          </div>
          <div className="rs-list">
            {favorites.map((fav) => (
              <div key={fav.placeId} className="fav-item">
                <button className="fav-item-main" onClick={() => onSelect(fav)}>
                  <span className="fav-item-star">★</span>
                  <div className="rs-item-text">
                    <span className="rs-item-origin">{fav.shortName || fav.displayName.split(",")[0]}</span>
                    <span className="rs-item-dest">{fav.displayName.split(",").slice(1, 3).join(",").trim()}</span>
                  </div>
                </button>
                <button className="fav-remove-btn" onClick={() => onRemove(fav)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── RecentSearchesCard ─────────────────────────────────────────────────────
function RecentSearchesCard({ searchHistory, onSelect, onClear }) {
  const [visible, setVisible] = useState(false);
  if (!searchHistory?.length) return null;
  return (
    <div className="recent-searches-wrapper">
      <button className="recent-searches-toggle" onClick={() => setVisible(v => !v)}>
        <span className="rs-toggle-left">
          🕒 Recent Searches
          <span className="rs-badge">{searchHistory.length}</span>
        </span>
        <span style={{ transition: "transform 0.2s", display: "inline-block", transform: visible ? "rotate(180deg)" : "none" }}>▾</span>
      </button>
      {visible && (
        <div className="recent-searches-card">
          <div className="rs-card-header">
            <span className="rs-card-title">Recent Routes</span>
            <button className="rs-clear-btn" onClick={onClear}>Clear all</button>
          </div>
          <div className="rs-list">
            {searchHistory.map((item, i) => (
              <button key={i} className="rs-item" onClick={() => onSelect(item)}>
                <div className="rs-item-icons">
                  <span className="rs-dot rs-dot-origin" />
                  <span className="rs-dot-line" />
                  <span className="rs-dot rs-dot-dest" />
                </div>
                <div className="rs-item-text">
                  <span className="rs-item-origin">{item.origin}</span>
                  <span className="rs-item-dest">{item.destination}</span>
                </div>
                <span className="rs-item-arrow">›</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main SearchPanel ───────────────────────────────────────────────────────
export default function SearchPanel({
  origin, destination,
  waypoints = [],
  searchHistory,
  onOriginSelect, onDestinationSelect,
  onSwap, onStartNavigation,
  onAddWaypoint, onRemoveWaypoint, onWaypointSelect,
  onHistorySelect, onHistoryClear,
  onTravelModeChange,
  selectedRouteIndex = 0,
  loading,
}) {
  const [favorites, setFavorites]   = useState(loadFavorites);
  const [travelMode, setTravelMode] = useState("drive");

  const handleToggleFavorite = useCallback((place) => {
    setFavorites((prev) => {
      const exists  = prev.some((f) => f.placeId === place.placeId);
      const updated = exists
        ? prev.filter((f) => f.placeId !== place.placeId)
        : [{ placeId: place.placeId, shortName: place.shortName, displayName: place.displayName, lat: place.lat, lng: place.lng }, ...prev].slice(0, 10);
      saveFavorites(updated);
      return updated;
    });
  }, []);

  const handleRemoveFavorite = useCallback((place) => {
    setFavorites((prev) => { const u = prev.filter((f) => f.placeId !== place.placeId); saveFavorites(u); return u; });
  }, []);

  const handleTravelMode = (mode) => {
    setTravelMode(mode);
    onTravelModeChange?.(mode);
  };

  return (
    <div className="search-panel">
      {/* Travel mode tabs */}
      <TravelModeSelector value={travelMode} onChange={handleTravelMode} />

      {/* Search fields */}
      <div className="search-fields">
        <PlaceInput
          label="Origin" dotColor="#22c55e" value={origin}
          onSelect={onOriginSelect} onClear={() => onOriginSelect(null)}
          placeholder="Search starting location…"
          favorites={favorites} onToggleFavorite={handleToggleFavorite}
        />

        <MyLocationButton onLocate={onOriginSelect} />

        {/* Waypoints */}
        {waypoints.map((wp, i) => (
          <WaypointInput
            key={i} index={i} value={wp}
            onSelect={(place) => onWaypointSelect?.(i, place)}
            onRemove={() => onRemoveWaypoint?.(i)}
          />
        ))}

        {/* Add Stop — only show when both endpoints set */}
        {origin && destination && (
          <button className="add-stop-btn" onClick={onAddWaypoint}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Stop
          </button>
        )}

        <div className="swap-row">
          <div className="connector-line" />
          <button className="swap-btn" onClick={onSwap} disabled={!origin || !destination} title="Swap">⇅</button>
        </div>

        <PlaceInput
          label="Destination" dotColor="#ef4444" value={destination}
          onSelect={onDestinationSelect} onClear={() => onDestinationSelect(null)}
          placeholder="Search destination…"
          favorites={favorites} onToggleFavorite={handleToggleFavorite}
        />
      </div>

      {/* CTA row */}
      {origin && destination && (
        <div className="search-actions">
          <button className="start-nav-btn" onClick={onStartNavigation} disabled={loading}>
            {loading
              ? <><span className="loc-spinner" />Computing…</>
              : <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                  </svg>
                  Get Directions
                </>
            }
          </button>
          <ShareButton origin={origin} destination={destination} selectedRouteIndex={selectedRouteIndex} />
        </div>
      )}

      {loading && (
        <div className="search-computing">
          <div className="compute-dots"><span /><span /><span /></div>
          Computing optimal routes…
        </div>
      )}

      <FavoritesPanel favorites={favorites} onSelect={onOriginSelect} onRemove={handleRemoveFavorite} />
      <RecentSearchesCard searchHistory={searchHistory} onSelect={onHistorySelect} onClear={onHistoryClear} />
    </div>
  );
}