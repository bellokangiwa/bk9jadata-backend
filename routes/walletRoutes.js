const express = require("express");
const router = express.Router();

const verifyFirebaseToken = require("../middleware/authFirebase");
const ctrl = require("../controllers/walletController");

// Public: view wallet balance
router.get("/balance/:userId", ctrl.getBalance);

// Protected: initiate funding (generates Paystack payment session)
router.post("/fund", verifyFirebaseToken, ctrl.initiateFund);

// Public: verify a Paystack reference
router.get("/verify/:reference", ctrl.verifyFund);

// Protected: debit wallet
router.post("/debit", verifyFirebaseToken, ctrl.debit);

// Transaction history
router.get("/history/:userId", ctrl.history);

module.exports = router;
