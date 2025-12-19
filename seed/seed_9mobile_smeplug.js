require("dotenv").config();
const mongoose = require("mongoose");
const DataPlan = require("../models/DataPlan");
const plans = require("./data/smeplug_9mobile_plans");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    await DataPlan.deleteMany({
      network: "9MOBILE",
      provider: "SMEPLUG",
    });

    await DataPlan.insertMany(plans);
    console.log("✅ SMEPLUG 9mobile plans seeded successfully");

    process.exit();
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
}

seed();
