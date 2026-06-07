// src/utils/api.js — Centralized API calls
import axios from "axios";

const BASE = process.env.REACT_APP_API_URL || "/api";

const api = axios.create({ baseURL: BASE, timeout: 15000 });

export const geocode = (q) =>
  api.get("/geocode", { params: { q } }).then((r) => r.data);

export const reverseGeocode = (lat, lng) =>
  api.get("/geocode/reverse", { params: { lat, lng } }).then((r) => r.data);

// ── profile is now forwarded to the backend ────────────────────────────────
export const getRoute = (startLat, startLng, endLat, endLng, options = {}) =>
  api.get("/route", {
    params: {
      startLat, startLng, endLat, endLng,
      profile: options.profile || "driving-car",
    },
  }).then((r) => r.data);

export const getAQI = (lat, lng) =>
  api.get("/aqi", { params: { lat, lng } }).then((r) => r.data);

export const getReports = (bounds) =>
  api.get("/reports", { params: bounds }).then((r) => r.data);

export const createReport = (data) =>
  api.post("/reports", data).then((r) => r.data);

export const upvoteReport = (id) =>
  api.patch(`/reports/${id}/upvote`).then((r) => r.data);

export const healthCheck = () =>
  api.get("/health").then((r) => r.data);

// ── Gemini Chat ──────────────────────────────────────────────────────────────
export const askCogniAssist = (question, routeContext) =>
  api.post("/chat", { question, routeContext }).then((r) => r.data);

// Format duration in minutes/hours
export function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Format distance in km
export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)} km`;
}