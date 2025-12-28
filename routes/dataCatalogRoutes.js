const express = require("express");
const router = express.Router();
const DataPlan = require("../models/DataPlan");

// ===============================
// GET DATA CATEGORIES BY NETWORK
// ===============================
router.get("/categories", async (req, res) => {
  try {
    let { network } = req.query;

    if (!network) {
      return res.status(400).json({ error: "network is required" });
    }

    network = network.toUpperCase();

    const categories = await DataPlan.distinct("category", {
      network,
      status: "active",
    });

    res.json(categories);
  } catch (err) {
    console.error("Fetch categories failed:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});


// ===============================
// GET DATA PLANS
// ===============================
router.get("/plans", async (req, res) => {
  try {
    let { network, category } = req.query;

    if (!network || !category) {
      return res.status(400).json({ error: "network and category required" });
    }

    network = network.toUpperCase();
    category = category.toUpperCase();

    const plans = await DataPlan.find(
      {
        network,
        category,
        status: "active",
      },
      {
        // ⬇️ return only what Flutter needs
        name: 1,
        planType: 1,
        sellingPrice: 1,
      }
    ).sort({ sellingPrice: 1 });

    res.json(plans);
  } catch (err) {
    console.error("Fetch plans failed:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
