// src/components/Header.js
import React from "react";

export default function Header({ darkMode, onToggleDark }) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon">
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="18" r="17" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="18" cy="18" r="6" fill="currentColor" opacity="0.3" />
            <path d="M18 2 L18 8 M18 28 L18 34 M2 18 L8 18 M28 18 L34 18"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M10 10 L15 15 M21 21 L26 26 M10 26 L15 21 M21 15 L26 10"
              stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
            <circle cx="18" cy="18" r="3" fill="currentColor" />
          </svg>
        </div>
        <div>
          <h1 className="brand-name">Cognimap</h1>
          <p className="brand-tagline">Intelligent Environment-Aware Navigation</p>
        </div>
      </div>

      <div className="header-actions">
        <div className="api-badges">
          <span className="badge">OSM</span>
          <span className="badge">ORS</span>
          <span className="badge">OpenWeather</span>
        </div>
        <button
          className="dark-toggle"
          onClick={onToggleDark}
          title="Toggle map theme"
        >
          {darkMode ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>
    </header>
  );
}
