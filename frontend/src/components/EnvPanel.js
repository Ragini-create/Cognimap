// src/components/EnvPanel.js
import React from "react";

const AQI_CONFIG = {
  1: { label: "Good",      color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
  2: { label: "Fair",      color: "#84cc16", bg: "rgba(132,204,22,0.1)"  },
  3: { label: "Moderate",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  4: { label: "Poor",      color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
  5: { label: "Very poor", color: "#a855f7", bg: "rgba(168,85,247,0.1)"  },
};

// ── AQI Gauge ─────────────────────────────────────────────────────────────
function AQIGauge({ aqi }) {
  const pct = ((aqi - 1) / 4) * 96; // max 96% to keep cursor visible

  return (
    <div className="aqi-gauge-wrap">
      <div className="aqi-gauge-bar" style={{ position: "relative" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="aqi-segment"
            style={{ background: AQI_CONFIG[i].color, opacity: aqi === i ? 1 : 0.22 }}
          />
        ))}
        <div className="aqi-cursor" style={{ left: `${pct}%` }} aria-hidden="true" />
      </div>
      <div className="aqi-labels">
        <span>Good</span><span>Fair</span><span>Mod</span><span>Poor</span><span>V.Poor</span>
      </div>
    </div>
  );
}

// ── Weather icon ──────────────────────────────────────────────────────────
function WeatherIconClass({ description }) {
  const d = (description || "").toLowerCase();
  if (d.includes("thunder"))                       return "ti-cloud-storm";
  if (d.includes("rain") || d.includes("drizzle")) return "ti-cloud-rain";
  if (d.includes("snow"))                          return "ti-snowflake";
  if (d.includes("fog") || d.includes("mist") || d.includes("haze")) return "ti-mist";
  if (d.includes("cloud"))                         return "ti-cloud";
  return "ti-sun";
}

// ── EnvPanel ──────────────────────────────────────────────────────────────
export default function EnvPanel({ route }) {
  if (!route) return null;
  const { aqi, weather, cognimapScore } = route;
  if (!aqi || !weather) return null;

  const aqiConf  = AQI_CONFIG[aqi.aqi]  || AQI_CONFIG[1];
  const { breakdown } = cognimapScore;

  const breakdownItems = breakdown ? [
    { label: "Time",        val: breakdown.timeNorm,    icon: "ti-clock"          },
    { label: "Distance",    val: breakdown.distNorm,    icon: "ti-route"          },
    { label: "Air quality", val: breakdown.aqiNorm,     icon: "ti-leaf"           },
    { label: "Weather",     val: breakdown.weatherNorm, icon: "ti-cloud"          },
    { label: "Road safety", val: breakdown.safetyNorm,  icon: "ti-alert-triangle" },
  ] : [];

  return (
    <div className="env-panel">
      <div className="env-header section-label">
        <span>Environment</span>
      </div>

      {/* 2-col grid: AQI + Weather side by side */}
      <div className="env-grid">

        {/* AQI card */}
        <div className="env-card">
          <div className="env-card-title">
            <i className="ti ti-leaf" aria-hidden="true" style={{ color: aqiConf.color }} />
            Air quality
          </div>
          <div className="env-card-value" style={{ color: aqiConf.color }}>
            AQI {aqi.aqi}
          </div>
          <AQIGauge aqi={aqi.aqi} />
          <span
            className="env-badge"
            style={{ background: aqiConf.bg, color: aqiConf.color }}
          >
            {aqiConf.label}
          </span>
          {aqi.components?.pm2_5 && (
            <div className="pollutants">
              <span>PM2.5 {aqi.components.pm2_5?.toFixed(1)}</span>
              <span>NO₂ {aqi.components.no2?.toFixed(1)}</span>
              <span>O₃ {aqi.components.o3?.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Weather card */}
        <div className="env-card">
          <div className="env-card-title">
            <i className="ti ti-cloud" aria-hidden="true" style={{ color: "var(--accent)" }} />
            Weather
          </div>
          <div className="weather-row">
            <div className="weather-icon">
              <i className={`ti ${WeatherIconClass({ description: weather.description })}`}
                aria-hidden="true" style={{ fontSize: "1.4rem", color: "var(--text-secondary)" }} />
            </div>
            <div className="weather-details">
              <div className="weather-temp">{weather.temp}°C</div>
              <div className="weather-desc">{weather.description}</div>
            </div>
          </div>
          <div className="weather-stats">
            <span><i className="ti ti-droplet" aria-hidden="true" /> {weather.humidity}%</span>
            <span><i className="ti ti-wind" aria-hidden="true" /> {weather.windSpeed?.toFixed(1)} m/s</span>
          </div>
          <div className={`weather-risk risk-${weather.risk > 6 ? "high" : weather.risk > 3 ? "med" : "low"}`}>
            Risk {weather.risk}/10
          </div>
        </div>

      </div>

      {/* Score breakdown — full width below grid */}
      {breakdownItems.length > 0 && (
        <div className="env-card" style={{ marginTop: 8 }}>
          <div className="env-card-title" style={{ marginBottom: 10 }}>
            <i className="ti ti-chart-bar" aria-hidden="true" />
            Score breakdown
          </div>
          <div className="breakdown-bars">
            {breakdownItems.map(({ label, val, icon }) => {
              const pct   = Math.round(val);
              const color = pct > 70 ? "#ef4444" : pct > 40 ? "#f59e0b" : "#22c55e";
              return (
                <div key={label} className="breakdown-row">
                  <span className="breakdown-label">
                    <i className={`ti ${icon}`} aria-hidden="true" /> {label}
                  </span>
                  <div className="breakdown-track">
                    <div className="breakdown-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="breakdown-val">{pct}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}