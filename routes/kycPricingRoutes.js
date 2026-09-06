const express = require("express");

const router = express.Router();

const verifyAdmin = require("../middleware/adminAuth");

const ctrl = require("../controllers/kycPricingController");

// Get all KYC prices
router.get("/", verifyAdmin, ctrl.getPrices);

// Get one KYC price
router.get("/:service", verifyAdmin, ctrl.getPrice);

// Update KYC price
router.patch("/:service", verifyAdmin, ctrl.updatePrice);

module.exports = router;