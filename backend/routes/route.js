// routes/route.js — Routing & Smart Score Logic
const express = require("express");
const router = express.Router();
const axios = require("axios");
const NodeCache = require("node-cache");

const cache = new NodeCache({ stdTTL: 300 }); // 5 min cache

const ORS_BASE = "https://api.openrouteservice.org/v2";

/**
 * Helper: Fetch AQI for a coordinate pair from OpenWeather
 */
async function fetchAQI(lat, lon) {
  try {
    const key = process.env.OPENWEATHER_API_KEY;
    if (!key) return { aqi: 1, label: "Good", components: {} };
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${key}`;
    const { data } = await axios.get(url, { timeout: 5000 });
    const aqi = data.list?.[0]?.main?.aqi ?? 1;
    const components = data.list?.[0]?.components ?? {};
    const labels = ["", "Good", "Fair", "Moderate", "Poor", "Very Poor"];
    return { aqi, label: labels[aqi] || "Unknown", components };
  } catch {
    return { aqi: 1, label: "Good", components: {} };
  }
}

/**
 * Helper: Fetch weather for a coordinate pair
 */
async function fetchWeather(lat, lon) {
  try {
    const key = process.env.OPENWEATHER_API_KEY;
    if (!key) return { risk: 0, description: "Clear", temp: 25, humidity: 50 };
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}&units=metric`;
    const { data } = await axios.get(url, { timeout: 5000 });

    const weatherId = data.weather?.[0]?.id ?? 800;
    const description = data.weather?.[0]?.description ?? "Clear";
    const temp = data.main?.temp ?? 25;
    const humidity = data.main?.humidity ?? 50;
    const windSpeed = data.wind?.speed ?? 0;

    // Weather risk score 0–10 based on conditions
    let risk = 0;
    if (weatherId >= 200 && weatherId < 300) risk = 9;      // Thunderstorm
    else if (weatherId >= 300 && weatherId < 400) risk = 4; // Drizzle
    else if (weatherId >= 500 && weatherId < 600) risk = 7; // Rain
    else if (weatherId >= 600 && weatherId < 700) risk = 8; // Snow
    else if (weatherId >= 700 && weatherId < 800) risk = 5; // Atmosphere (fog/haze)
    else if (weatherId === 800) risk = 0;                    // Clear
    else if (weatherId > 800) risk = 1;                     // Clouds

    // Adjust for wind
    if (windSpeed > 10) risk = Math.min(10, risk + 2);

    return { risk, description, temp, humidity, windSpeed };
  } catch {
    return { risk: 0, description: "Clear", temp: 25, humidity: 50, windSpeed: 0 };
  }
}

/**
 * Helper: Count reports near a set of coordinates
 */
async function countNearbyReports(coordinates, Report) {
  try {
    // Sample every 10th coordinate to avoid too many DB queries
    const samples = coordinates.filter((_, i) => i % 10 === 0).slice(0, 20);
    let totalReports = 0;

    for (const coord of samples) {
      const count = await Report.countDocuments({
        location: {
          $near: {
            $geometry: { type: "Point", coordinates: [coord[0], coord[1]] },
            $maxDistance: 200, // 200 meters
          },
        },
        active: true,
      });
      totalReports += count;
    }

    return Math.min(totalReports, 20); // cap at 20 for scoring
  } catch {
    return 0;
  }
}

/**
 * Compute Cognimap Score
 * Lower score = better route
 */
function computeCognimapScore({ duration, distance, aqi, weatherRisk, safetyReports }) {
  const W = {
    time: 0.30,
    distance: 0.20,
    aqi: 0.20,
    weather: 0.15,
    safety: 0.15,
  };

  // Normalize each factor to 0–100 scale
  const timeNorm = Math.min((duration / 3600) * 100, 100);         // 1hr = 100
  const distNorm = Math.min((distance / 50000) * 100, 100);        // 50km = 100
  const aqiNorm = ((aqi - 1) / 4) * 100;                           // AQI 1–5 → 0–100
  const weatherNorm = weatherRisk * 10;                             // 0–10 → 0–100
  const safetyNorm = Math.min(safetyReports * 10, 100);            // reports → 0–100

  const score =
    W.time * timeNorm +
    W.distance * distNorm +
    W.aqi * aqiNorm +
    W.weather * weatherNorm +
    W.safety * safetyNorm;

  // Convert to 0–100 "safety score" (higher = better)
  const cognimapScore = Math.round(100 - score);

  let grade, color;
  if (cognimapScore >= 80) { grade = "Excellent"; color = "green"; }
  else if (cognimapScore >= 60) { grade = "Good"; color = "yellow"; }
  else if (cognimapScore >= 40) { grade = "Fair"; color = "orange"; }
  else { grade = "Poor"; color = "red"; }

  return { score: cognimapScore, grade, color, breakdown: { timeNorm, distNorm, aqiNorm, weatherNorm, safetyNorm } };
}

// ─── GET /api/route ──────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
const {
  startLat,
  startLng,
  endLat,
  endLng,
  profile = "driving-car",
} = req.query;

const VALID_PROFILES = [
  "driving-car",
  "cycling-regular",
  "foot-walking",
];

const safeProfile = VALID_PROFILES.includes(profile)
  ? profile
  : "driving-car";
    if (!startLat || !startLng || !endLat || !endLng) {
      return res.status(400).json({ error: "Missing coordinates" });
    }

    const cacheKey =
  `route_${startLat}_${startLng}_${endLat}_${endLng}_${safeProfile}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    const apiKey = process.env.ORS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "ORS API key not configured" });
    }

    // Fetch both fastest and alternate routes from ORS
    // Fetch routes from ORS with automatic fallback for long distances
let orsPayload = {
  coordinates: [
    [parseFloat(startLng), parseFloat(startLat)],
    [parseFloat(endLng), parseFloat(endLat)],
  ],
  alternative_routes: {
    target_count: 2,
    weight_factor: 1.6,
    share_factor: 0.6,
  },
  instructions: false,
  geometry: true,
};

console.log("Using profile:", safeProfile);

let orsResponse;

try {
  // Try alternative routes first
orsResponse = await axios.post(
  `${ORS_BASE}/directions/${safeProfile}/geojson`,
    orsPayload,
    {
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    }
  );
} catch (error) {
  const message = error.response?.data?.error?.message || "";

  if (message.includes("must not be greater than 100000")) {
    console.log(
      "⚠️ Long-distance route detected. Falling back to primary route."
    );

    // Retry without alternative routes
    orsPayload = {
      coordinates: [
        [parseFloat(startLng), parseFloat(startLat)],
        [parseFloat(endLng), parseFloat(endLat)],
      ],
      instructions: false,
      geometry: true,
    };

orsResponse = await axios.post(
  `${ORS_BASE}/directions/${safeProfile}/geojson`,
      orsPayload,
      {
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );
  } else {
    throw error;
  }
}

    const Report = require("../models/Report");
    const routes = orsResponse.data.features;
    const enrichedRoutes = [];

    // Midpoint coordinates for env data
    const midLat = (parseFloat(startLat) + parseFloat(endLat)) / 2;
    const midLng = (parseFloat(startLng) + parseFloat(endLng)) / 2;

    // Fetch env data once (shared for all routes, mid-route sample)
    const [aqiData, weatherData] = await Promise.all([
      fetchAQI(midLat, midLng),
      fetchWeather(midLat, midLng),
    ]);

    for (let i = 0; i < routes.length; i++) {
      const feature = routes[i];
      const props = feature.properties.summary;
      const coordinates = feature.geometry.coordinates;

      const safetyReports = await countNearbyReports(coordinates, Report);

      const cognimapScore = computeCognimapScore({
        duration: props.duration,
        distance: props.distance,
        aqi: aqiData.aqi,
        weatherRisk: weatherData.risk,
        safetyReports,
      });

      enrichedRoutes.push({
        id: i,
        label: i === 0 ? "Recommended Route" : `Alternative Route ${i}`,
        distance: props.distance,
        duration: props.duration,
        coordinates: coordinates.map(([lng, lat]) => [lat, lng]), // flip for Leaflet
        cognimapScore,
        aqi: aqiData,
        weather: weatherData,
        safetyReports,
      });
    }

    // Sort by Cognimap score (highest = best)
    enrichedRoutes.sort((a, b) => b.cognimapScore.score - a.cognimapScore.score);
    enrichedRoutes[0].recommended = true;

    const result = { routes: enrichedRoutes, generatedAt: new Date().toISOString() };
    cache.set(cacheKey, result);

    return res.json(result);
  } catch (err) {
    console.error("Route error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to generate route", detail: err.message });
  }
});

module.exports = router;