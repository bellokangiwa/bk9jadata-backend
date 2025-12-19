const mongoose = require("mongoose");

const dataPlanSchema = new mongoose.Schema(
  {
    network: {
      type: String,
      required: true,
      enum: ["MTN", "AIRTEL", "GLO", "9MOBILE"],
    },

    provider: {
      type: String,
      required: true,
      enum: ["SMEPLUG", "CLUBKONNECT"],
    },

    planType: {
      type: String,
      required: true,
      enum: ["DAILY", "WEEKLY", "MONTHLY"],
    },

    name: {
      type: String,
      required: true,
    },

    // SMEPLUG only
    apiCode: {
      type: String,
      default: null,
    },

    // clubKonnect only (e.g 1000, 500.01)
    dataValue: {
      type: Number,
      default: null,
    },

    costPrice: {
      type: Number,
      required: true,
    },

    sellingPrice: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DataPlan", dataPlanSchema);
