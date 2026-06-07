// models/Report.js — Road Damage / Hazard Report Schema
const mongoose = require("mongoose");

/**
 * Road Report Schema
 * Stores user-submitted road damage reports (potholes, flooding, etc.)
 */
const reportSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["pothole", "flooding", "construction", "accident", "debris", "other"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    description: {
      type: String,
      maxlength: 500,
      default: "",
    },
    location: {
      // GeoJSON Point for geospatial queries
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    address: {
      type: String,
      default: "",
    },
    upvotes: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);

// Create 2dsphere index for location-based queries
reportSchema.index({ location: "2dsphere" });

// Auto-deactivate reports older than 7 days
reportSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model("Report", reportSchema);
