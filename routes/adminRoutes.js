// routes/adminRoutes.js
const express = require("express");
const router = express.Router();

const verifyAdmin = require("../middleware/adminAuth");
const adminCtrl = require("../controllers/adminController");
const revenueCtrl = require("../controllers/adminRevenueController");

// ================= REVENUE =================
router.get(
  "/revenue",
  verifyAdmin,
  revenueCtrl.getRevenueStats
);
// ================= PROVIDER BALANCES =================
router.get(
  "/provider-balances",
  verifyAdmin,
  adminCtrl.getProviderBalances
);
// ================= TRANSACTIONS =================
router.get(
  "/transactions",
  verifyAdmin,
  adminCtrl.getAllTransactions
);

router.get(
  "/transactions/status",
  verifyAdmin,
  adminCtrl.getTransactionsByStatus
);

router.get(
  "/transactions/:id",
  verifyAdmin,
  adminCtrl.getTransactionById
);

// ================= USERS =================
router.post(
  "/users/reset-password",
  verifyAdmin,
  adminCtrl.resetUserPassword
);

// ================= WALLET =================
router.post(
  "/wallet/credit",
  verifyAdmin,
  adminCtrl.creditUserWallet
);

router.post(
  "/wallet/debit",
  verifyAdmin,
  adminCtrl.debitUserWallet
);

module.exports = router;