require("dotenv").config();
const mongoose = require("mongoose");
const DataPlan = require("../models/DataPlan");
const plans = require("./data/smeplug_glo_plans");

const MONGO_URI = process.env.MONGO_URI;

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");

    await DataPlan.deleteMany({
      network: "GLO",
      provider: "SMEPLUG",
    });

    await DataPlan.insertMany(plans);
    console.log("✅ SMEPLUG GLO plans seeded successfully");

    process.exit();
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
}

seed();
