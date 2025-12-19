require("dotenv").config();
const mongoose = require("mongoose");
const DataPlan = require("../models/DataPlan");
const plans = require("./data/smeplug_mtn_plans");

const MONGO_URI = process.env.MONGO_URI;

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");

    await DataPlan.deleteMany({
      network: "MTN",
      provider: "SMEPLUG",
    });

    await DataPlan.insertMany(plans);
    console.log("✅ SMEPLUG MTN plans seeded successfully");

    process.exit();
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
}

seed();
