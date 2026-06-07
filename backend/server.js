// server.js — Cognimap Express Backend
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/cognimap";
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("✅ MongoDB connected:", uri.split("@").pop());
  } catch (err) {
    console.warn("⚠️  MongoDB not available — road reports will be disabled.");
    console.warn("   Start MongoDB or set MONGODB_URI in .env");
  }
};

app.use("/api/route", require("./routes/route"));
app.use("/api/geocode", require("./routes/geocode"));
app.use("/api/aqi", require("./routes/aqi"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/chat", require("./routes/chat")); // ← Gemini chat
app.post("/api/report", require("./routes/reports"));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    env: {
      ors: !!process.env.ORS_API_KEY,
      weather: !!process.env.OPENWEATHER_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
    },
    time: new Date().toISOString(),
  });
});

app.use((_req, res) => res.status(404).json({ error: "Endpoint not found" }));

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n🗺️  Cognimap Backend running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  });
};

start();