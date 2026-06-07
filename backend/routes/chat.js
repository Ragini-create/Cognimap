// routes/chat.js — Gemini-powered route assistant
const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/", async (req, res) => {
  try {
    const { question, routeContext } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }

    const ctx = routeContext
      ? `
Current route information:
- From: ${routeContext.origin}
- To: ${routeContext.destination}
- Duration: ${routeContext.duration}
- Distance: ${routeContext.distance}
- Cognimap Safety Score: ${routeContext.score}/100 (${routeContext.grade})
- Air Quality Index: ${routeContext.aqi} (${routeContext.aqiLabel})
- Weather: ${routeContext.weatherDesc}, ${routeContext.temp}°C, humidity ${routeContext.humidity}%, wind ${routeContext.windSpeed} m/s
- Weather Risk: ${routeContext.weatherRisk}/10
- Road Issues Reported: ${routeContext.safetyReports}
- ETA: ${routeContext.eta}
`
      : "No route selected yet.";

    const prompt = `You are CogniAssist, a helpful navigation assistant built into Cognimap, an intelligent navigation app for India.

${ctx}

You help users with:
- Toll booth names, count, and costs (FastTag vs cash) for Indian highways
- Restaurants, dhabas, petrol bunks, hotels near the route
- Weather conditions and road safety tips
- Traffic patterns and best travel times
- Fuel cost estimates based on distance and vehicle type
- Any route-related questions

Guidelines:
- Use the route context above to give specific answers
- If exact data is unavailable, give realistic estimates based on Indian roads and highways
- For toll questions, name actual toll plazas if you know them for the route
- For restaurant/fuel questions, mention well-known chains or areas along the route
- Keep responses under 120 words
- Be friendly, helpful and specific to India
- Never say you cannot help — always give your best estimate

User question: ${question}`;

    const { data } = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
      },
      { timeout: 20000 }
    );

    const answer =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't get a response. Try again!";
    return res.json({ answer });
  } catch (err) {
    console.error("Gemini error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to get AI response" });
  }
});

module.exports = router;