// routes/geocode.js — Mapbox Geocoding (with Nominatim fallback)
const express = require("express");
const router = express.Router();
const axios = require("axios");
const NodeCache = require("node-cache");

const cache = new NodeCache({ stdTTL: 600 }); // 10 min cache
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

// ── Mapbox forward geocode ────────────────────────────────────────────────
async function geocodeMapbox(q) {
  const encoded = encodeURIComponent(q.trim());
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json`;
  const { data } = await axios.get(url, {
    params: {
      access_token: MAPBOX_TOKEN,
      limit: 6,
      language: "en",
      proximity: "78.4867,17.3850", // bias toward Hyderabad
    },
    timeout: 8000,
  });
  return data.features.map((f) => ({
    placeId: f.id,
    displayName: f.place_name,
    shortName: f.text,
    lat: f.center[1],
    lng: f.center[0],
    type: f.place_type?.[0] || "place",
    category: f.properties?.category || "",
  }));
}

// ── Nominatim fallback ───────────────────────────────────────────────────
async function geocodeNominatim(q) {
  const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: { q: q.trim(), format: "json", limit: 5, addressdetails: 1 },
    headers: { "User-Agent": "Cognimap/1.0 (contact@cognimap.app)", "Accept-Language": "en" },
    timeout: 8000,
  });
  return data.map((item) => ({
    placeId: item.place_id,
    displayName: item.display_name,
    shortName:
      item.address?.city ||
      item.address?.town ||
      item.address?.village ||
      item.address?.county ||
      item.display_name.split(",")[0],
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    type: item.type,
    category: item.class,
  }));
}

// ── Mapbox reverse geocode ───────────────────────────────────────────────
async function reverseMapbox(lat, lng) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`;
  const { data } = await axios.get(url, {
    params: { access_token: MAPBOX_TOKEN, limit: 1, language: "en" },
    timeout: 5000,
  });
  const f = data.features?.[0];
  if (!f) throw new Error("No result");
  return {
    displayName: f.place_name,
    shortName: f.text || f.place_name.split(",")[0],
    lat: parseFloat(lat),
    lng: parseFloat(lng),
  };
}

// ── Nominatim reverse fallback ───────────────────────────────────────────
async function reverseNominatim(lat, lng) {
  const { data } = await axios.get("https://nominatim.openstreetmap.org/reverse", {
    params: { lat, lon: lng, format: "json" },
    headers: { "User-Agent": "Cognimap/1.0" },
    timeout: 5000,
  });
  return {
    displayName: data.display_name,
    shortName:
      data.address?.road ||
      data.address?.suburb ||
      data.address?.city ||
      "Unknown location",
    lat: parseFloat(lat),
    lng: parseFloat(lng),
  };
}

// ── GET /api/geocode?q= ──────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2)
      return res.status(400).json({ error: "Query too short" });

    const cacheKey = `geo_${q.toLowerCase().trim()}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    let results;
    if (MAPBOX_TOKEN) {
      try {
        results = await geocodeMapbox(q);
      } catch (err) {
        console.warn("Mapbox geocode failed, falling back to Nominatim:", err.message);
        results = await geocodeNominatim(q);
      }
    } else {
      console.warn("MAPBOX_TOKEN not set — using Nominatim fallback");
      results = await geocodeNominatim(q);
    }

    cache.set(cacheKey, results);
    return res.json(results);
  } catch (err) {
    console.error("Geocode error:", err.message);
    return res.status(500).json({ error: "Geocoding failed" });
  }
});

// ── GET /api/geocode/reverse?lat=&lng= ──────────────────────────────────
router.get("/reverse", async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: "Missing coordinates" });

    let result;
    if (MAPBOX_TOKEN) {
      try {
        result = await reverseMapbox(lat, lng);
      } catch (err) {
        console.warn("Mapbox reverse failed, falling back to Nominatim:", err.message);
        result = await reverseNominatim(lat, lng);
      }
    } else {
      result = await reverseNominatim(lat, lng);
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: "Reverse geocoding failed" });
  }
});

module.exports = router;
