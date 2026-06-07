// routes/aqi.js — Air Quality & Weather Data
const express = require("express");
const router = express.Router();
const axios = require("axios");
const NodeCache = require("node-cache");

const cache = new NodeCache({ stdTTL: 900 }); // 15 min cache for AQI

// GET /api/aqi?lat=&lng=
router.get("/", async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: "Missing coordinates" });

    const cacheKey = `aqi_${parseFloat(lat).toFixed(2)}_${parseFloat(lng).toFixed(2)}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const key = process.env.OPENWEATHER_API_KEY;
    if (!key) {
      return res.json({
        aqi: 1,
        label: "Good",
        color: "#22c55e",
        components: {},
        weather: { description: "N/A", temp: "--", humidity: "--" },
        note: "API key not configured — showing demo data",
      });
    }

    const [aqiRes, weatherRes] = await Promise.all([
      axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${key}`, { timeout: 6000 }),
      axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${key}&units=metric`, { timeout: 6000 }),
    ]);

    const aqiValue = aqiRes.data.list?.[0]?.main?.aqi ?? 1;
    const components = aqiRes.data.list?.[0]?.components ?? {};

    const aqiLabels = ["", "Good", "Fair", "Moderate", "Poor", "Very Poor"];
    const aqiColors = ["", "#22c55e", "#84cc16", "#f59e0b", "#ef4444", "#7c3aed"];

    const weatherMain = weatherRes.data.weather?.[0];
    const weatherData = {
      description: weatherMain?.description ?? "Clear",
      icon: weatherMain?.icon ?? "01d",
      temp: Math.round(weatherRes.data.main?.temp ?? 25),
      feelsLike: Math.round(weatherRes.data.main?.feels_like ?? 25),
      humidity: weatherRes.data.main?.humidity ?? 50,
      windSpeed: weatherRes.data.wind?.speed ?? 0,
      visibility: weatherRes.data.visibility ?? 10000,
    };

    const result = {
      aqi: aqiValue,
      label: aqiLabels[aqiValue],
      color: aqiColors[aqiValue],
      components: {
        co: components.co,
        no2: components.no2,
        o3: components.o3,
        pm2_5: components.pm2_5,
        pm10: components.pm10,
      },
      weather: weatherData,
    };

    cache.set(cacheKey, result);
    return res.json(result);
  } catch (err) {
    console.error("AQI error:", err.message);
    return res.status(500).json({ error: "Failed to fetch environmental data" });
  }
});

module.exports = router;
