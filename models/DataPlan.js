
const mongoose = require("mongoose");

const dataPlanSchema = new mongoose.Schema(
  {
    // NETWORK
    network: {
      type: String,
      required: true,
      enum: ["MTN", "AIRTEL", "GLO", "9MOBILE"],
    },

    // PROVIDER
    provider: {
      type: String,
      required: true,
      enum: ["SMEPLUG", "CLUBKONNECT", "RUFISDATA"],
    },

    // CATEGORY SHOWN IN BK9JADATASUB
    category: {
      type: String,
      required: true,
      enum: [
        "SME",
        "CORPORATE",
        "DIRECT",
        "AWOOF",
        "GIFTING",
        "SOCIAL",
        "SHARE",
      ],
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

    // =========================
    // SMEPLUG FIELDS
    // =========================

    apiCode: {
      type: String,
      default: null,
    },

    smeplugNetworkId: {
      type: Number,
      default: null,
    },

    smeplugPlanId: {
      type: Number,
      default: null,
    },

    // =========================
    // CLUBKONNECT FIELDS
    // =========================

    dataValue: {
      type: Number,
      default: null,
    },

    // =========================
    // RUFISDATA FIELDS
    // =========================

    // Data ID from RufisData price list
    rufisDataId: {
      type: Number,
      default: null,
    },

    // RufisData network ID:
    // MTN = 1
    // GLO = 2
    // 9MOBILE = 3
    // AIRTEL = 4
    rufisNetworkId: {
      type: Number,
      default: null,
    },

    // Original RufisData plan category
    // e.g. SME, CORPORATE GIFTING, DATA SHARE
    rufisPlanType: {
      type: String,
      default: null,
    },

    // =========================
    // PRICING
    // =========================

    costPrice: {
      type: Number,
      required: true,
    },

    sellingPrice: {
      type: Number,
      required: true,
    },

    // =========================
    // STATUS
    // =========================

    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DataPlan", dataPlanSchema);
