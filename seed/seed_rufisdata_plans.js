
require("dotenv").config();

const mongoose = require("mongoose");
const DataPlan = require("../models/DataPlan");

const plans = require("./data/rufisdata_recommended_plans");

async function seed() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from environment variables");
    }

    if (!Array.isArray(plans) || plans.length === 0) {
      throw new Error("No RufisData plans found in the plans file");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB connected");

    const operations = plans.map((plan) => {
      if (
        !plan.network ||
        !plan.rufisDataId ||
        plan.sellingPrice == null ||
        plan.costPrice == null
      ) {
        throw new Error(
          `Invalid RufisData plan: ${JSON.stringify(plan)}`
        );
      }

      return {
        updateOne: {
          filter: {
            provider: "RUFISDATA",
            network: plan.network,
            rufisDataId: plan.rufisDataId,
          },

          update: {
            // Update plan details and prices.
            $set: plan,

            // Only set the initial status for newly inserted plans.
            // Existing plan statuses will remain unchanged.
            $setOnInsert: {
              status: "disabled",
            },
          },

          upsert: true,
        },
      };
    });

    const result = await DataPlan.bulkWrite(operations, {
      ordered: false,
    });

    console.log("✅ RufisData plans seeded successfully");
    console.log("Total selected plans:", plans.length);
    console.log("New plans inserted:", result.upsertedCount);
    console.log("Existing plans modified:", result.modifiedCount);
    console.log("✅ New RufisData plans are DISABLED pending testing.");

  } catch (err) {
    console.error("❌ RufisData seeding failed:", err.message);
    process.exitCode = 1;

  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

seed();
