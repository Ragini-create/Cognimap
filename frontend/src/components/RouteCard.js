// src/components/RouteCard.js
import React from "react";
import { formatDuration, formatDistance } from "../utils/api";

const SCORE_COLORS = {
  green:  "#22c55e",
  yellow: "#eab308",
  orange: "#f97316",
  red:    "#ef4444",
};

export default function RouteCard({ route, selected, onSelect, index = 0 }) {
  const { cognimapScore, distance, duration, label, recommended, safetyReports, aqi, weather } = route;
  const scoreColor = SCORE_COLORS[cognimapScore.color] || "#22c55e";
  const isBest = recommended || index === 0;

  return (
    <div
      className={`route-card${selected ? " selected" : ""}${isBest ? " route-best" : " route-alt"}`}
      onClick={onSelect}
    >
      {/* Top row */}
      <div className="route-card-top">
        <div className="route-card-left">
          <div className="route-card-label">{label}</div>
          <div className="route-badges">
            {isBest
              ? <span className="badge-best">★ Best Route</span>
              : <span className="badge-alt">↗ Alternate</span>
            }
            {aqi && aqi.aqi <= 2 && <span className="badge-eco">🌿 Clean Air</span>}
          </div>
        </div>
        <div className="route-score" style={{ color: scoreColor }}>
          <div className="score-ring">
            <svg viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3"/>
              <circle
                cx="20" cy="20" r="16" fill="none"
                stroke={scoreColor} strokeWidth="3"
                strokeDasharray={`${cognimapScore.score} 100`}
                strokeDashoffset="25" strokeLinecap="round"
                transform="rotate(-90 20 20)"
                style={{ transition: "stroke-dasharray 1s ease" }}
              />
            </svg>
            <span className="score-num">{cognimapScore.score}</span>
          </div>
          <span className="score-grade">{cognimapScore.grade}</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="route-metrics">
        <div className="metric">
          <div className="metric-value">{formatDuration(duration)}</div>
          <div className="metric-key">Duration</div>
        </div>
        <div className="metric">
          <div className="metric-value">{formatDistance(distance)}</div>
          <div className="metric-key">Distance</div>
        </div>
        <div className="metric">
          <div className="metric-value">{safetyReports}</div>
          <div className="metric-key">Issues</div>
        </div>
      </div>

      {/* AQI + weather inline strip */}
      {(aqi || weather) && (
        <div className="route-env-strip">
          {aqi && (
            <span className="route-env-pill" style={{
              color: SCORE_COLORS[cognimapScore.color] || "#22c55e",
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.18)"
            }}>
              🌿 AQI {aqi.aqi} · {aqi.label}
            </span>
          )}
          {weather && (
            <span className="route-env-pill" style={{
              color: "var(--text-secondary)",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)"
            }}>
              🌡️ {weather.temp}°C · {(weather.description || "").split(" ")[0]}
            </span>
          )}
        </div>
      )}

      {/* Score bar */}
      <div className="score-bar-wrap">
        <div className="score-bar-track">
          <div className="score-bar-fill" style={{ width: `${cognimapScore.score}%`, background: scoreColor }}/>
        </div>
        <span className="score-bar-label" style={{ color: scoreColor }}>Cognimap Score</span>
      </div>
    </div>
  );
}