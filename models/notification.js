const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // Notification title
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    // Notification body
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    // Optional banner image
    image: {
      type: String,
      default: "",
    },

    // Notification type
    type: {
      type: String,
      enum: [
        "general",
        "promotion",
        "maintenance",
        "wallet",
        "transaction",
        "security",
        "news",
        "update",
      ],
      default: "general",
    },

    // Priority
    priority: {
      type: String,
      enum: [
        "low",
        "normal",
        "high",
      ],
      default: "normal",
    },

    // Notification target
    target: {
      type: String,
      enum: [
        "all",
        "single",
        "selected",
      ],
      default: "all",
    },

    // User UID (used when target = single)
    targetUser: {
      type: String,
      default: "",
    },

    // Reserved for future multi-user notifications
    targetUsers: {
      type: [String],
      default: [],
    },

    // Active / Hidden
    active: {
      type: Boolean,
      default: true,
    },

    // Schedule
    publishAt: {
      type: Date,
      default: Date.now,
    },

    // Creator
    createdBy: {
      type: String,
      default: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Notification",
  notificationSchema
);