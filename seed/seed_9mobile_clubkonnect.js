// seed/seed_9mobile_clubKonnect.js

const mongoose = require("mongoose");
require("dotenv").config();

const DataPlan = require("../models/DataPlan");
const plans = require("./data/clubKonnect_9mobile_plans");

async function seed9mobileClubKonnect() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB connected");

    // Remove old 9mobile ClubKonnect plans
    await DataPlan.deleteMany({
      network: "9mobile",
      provider: "clubKonnect",
    });

    // Insert new plans
    await DataPlan.insertMany(plans);

    console.log("✅ 9mobile ClubKonnect plans seeded successfully");
    process.exit();
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
}

seed9mobileClubKonnect();
