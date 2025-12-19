const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    // Firebase user UID
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // Phone number that received data
    phone: {
      type: String,
      required: true,
    },

    // Network name
    network: {
      type: String,
      enum: ["MTN", "AIRTEL", "GLO", "9MOBILE"],
      required: true,
    },

    // Provider used
    provider: {
      type: String,
      enum: ["SMEPLUG", "CLUBKONNECT"],
      required: true,
    },

    // Data plan reference
    dataPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DataPlan",
      required: true,
    },

    // Amount charged to user (selling price)
    amount: {
      type: Number,
      required: true,
    },

    // Provider request ID
    requestId: {
      type: String,
      required: true,
      unique: true,
    },

    // Provider response (raw)
    providerResponse: {
      type: Object,
      default: {},
    },

    // Transaction status
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },

    // Reason for failure (if any)
    failureReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);