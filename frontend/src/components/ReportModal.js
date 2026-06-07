// src/components/ReportModal.js — Road damage report submission
import React, { useState } from "react";
import { createReport, reverseGeocode } from "../utils/api";

const TYPES = [
  { value: "pothole", label: "🕳️ Pothole", desc: "Damaged road surface" },
  { value: "flooding", label: "💧 Flooding", desc: "Water on road" },
  { value: "construction", label: "🚧 Construction", desc: "Active road work" },
  { value: "accident", label: "💥 Accident", desc: "Vehicle collision" },
  { value: "debris", label: "🪨 Debris", desc: "Objects on road" },
  { value: "other", label: "⚠️ Other", desc: "Other hazard" },
];

const SEVERITIES = [
  { value: "low", label: "Low", color: "#22c55e" },
  { value: "medium", label: "Medium", color: "#f97316" },
  { value: "high", label: "High", color: "#ef4444" },
];

export default function ReportModal({ lat, lng, onSave, onClose }) {
  const [type, setType] = useState("pothole");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      let address = "";
      try {
        const rev = await reverseGeocode(lat, lng);
        address = rev.shortName || "";
      } catch {}

      const report = await createReport({ type, severity, description, lat, lng, address });
      onSave({ ...report, lat, lng, type, severity, description, createdAt: new Date().toISOString() });
    } catch (e) {
      setError(e.response?.data?.error || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">📍 Report Road Issue</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-coords">
          📌 {lat.toFixed(5)}, {lng.toFixed(5)}
        </div>

        <div className="modal-section">
          <label className="modal-label">Issue Type</label>
          <div className="type-grid">
            {TYPES.map((t) => (
              <button
                key={t.value}
                className={`type-btn ${type === t.value ? "active" : ""}`}
                onClick={() => setType(t.value)}
              >
                <div className="type-icon">{t.label.split(" ")[0]}</div>
                <div className="type-name">{t.label.split(" ").slice(1).join(" ")}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="modal-section">
          <label className="modal-label">Severity</label>
          <div className="severity-row">
            {SEVERITIES.map((s) => (
              <button
                key={s.value}
                className={`severity-btn ${severity === s.value ? "active" : ""}`}
                style={{ "--sev-color": s.color }}
                onClick={() => setSeverity(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-section">
          <label className="modal-label">Description (optional)</label>
          <textarea
            className="modal-textarea"
            placeholder="Describe the issue…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={300}
          />
        </div>

        {error && <div className="modal-error">⚠️ {error}</div>}

        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-submit" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
