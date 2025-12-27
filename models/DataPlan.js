const mongoose = require("mongoose");

const dataPlanSchema = new mongoose.Schema(
  {
    // NETWORK
    network: {
      type: String,
      required: true,
      enum: ["MTN", "AIRTEL", "GLO", "9MOBILE"],
    },

    // PROVIDER (backend only)
    provider: {
      type: String,
      required: true,
      enum: ["SMEPLUG", "CLUBKONNECT"],
    },

    // CATEGORY (what users understand)
    category: {
      type: String,
      required: true,
      enum: ["SME", "CORPORATE", "DIRECT", "AWOOF", "GIFTING", "SOCIAL", "SHARE"],
    },

    // DURATION
    planType: {
      type: String,
      required: true,
      enum: ["DAILY", "WEEKLY", "MONTHLY"],
    },

    // DISPLAY NAME
    name: {
      type: String,
      required: true,
    },

    // SMEPLUG only
    apiCode: {
      type: String,
      default: null,
    },

    // ClubKonnect only (e.g 1000, 500.01)
    dataValue: {
      type: Number,
      default: null,
    },

    // PRICING
    costPrice: {
      type: Number,
      required: true,
    },

    sellingPrice: {
      type: Number,
      required: true,
    },

    // STATUS
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DataPlan", dataPlanSchema);