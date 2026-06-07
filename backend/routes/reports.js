// routes/reports.js — Road Damage Reports CRUD
const express = require("express");
const router = express.Router();
const Report = require("../models/Report");

// GET /api/reports — fetch all active reports (optionally bounded)
router.get("/", async (req, res) => {
  try {
    const { minLat, maxLat, minLng, maxLng } = req.query;

    let query = { active: true };

    // If bounding box provided, filter geographically
    if (minLat && maxLat && minLng && maxLng) {
      query.location = {
        $geoWithin: {
          $box: [
            [parseFloat(minLng), parseFloat(minLat)],
            [parseFloat(maxLng), parseFloat(maxLat)],
          ],
        },
      };
    }

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    // Reshape for frontend
    const formatted = reports.map((r) => ({
      id: r._id,
      type: r.type,
      severity: r.severity,
      description: r.description,
      lat: r.location.coordinates[1],
      lng: r.location.coordinates[0],
      address: r.address,
      upvotes: r.upvotes,
      createdAt: r.createdAt,
    }));

    return res.json(formatted);
  } catch (err) {
    console.error("Reports fetch error:", err.message);
    return res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// POST /api/report — create a new report
router.post("/", async (req, res) => {
  try {
    const { type, severity, description, lat, lng, address } = req.body;

    if (!type || !lat || !lng) {
      return res.status(400).json({ error: "type, lat, and lng are required" });
    }

    const report = await Report.create({
      type,
      severity: severity || "medium",
      description: description || "",
      location: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
      address: address || "",
    });

    return res.status(201).json({
      id: report._id,
      type: report.type,
      severity: report.severity,
      lat,
      lng,
      createdAt: report.createdAt,
    });
  } catch (err) {
    console.error("Report create error:", err.message);
    return res.status(500).json({ error: "Failed to save report" });
  }
});

// PATCH /api/reports/:id/upvote
router.patch("/:id/upvote", async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { $inc: { upvotes: 1 } },
      { new: true }
    );
    if (!report) return res.status(404).json({ error: "Report not found" });
    return res.json({ upvotes: report.upvotes });
  } catch (err) {
    return res.status(500).json({ error: "Failed to upvote" });
  }
});

// DELETE /api/reports/:id — soft delete
router.delete("/:id", async (req, res) => {
  try {
    await Report.findByIdAndUpdate(req.params.id, { active: false });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete report" });
  }
});

module.exports = router;
