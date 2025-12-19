require("dotenv").config();
const mongoose = require("mongoose");
const DataPlan = require("../models/DataPlan");
const plans = require("./data/clubkonnect_mtn_plans");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    await DataPlan.deleteMany({
      network: "MTN",
      provider: "CLUBKONNECT",
    });

    await DataPlan.insertMany(plans);
    console.log("✅ clubKonnect MTN plans seeded successfully");

    process.exit();
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
}

seed();
