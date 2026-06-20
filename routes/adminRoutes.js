// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const verifyAdmin = require("../middleware/adminAuth");
const adminCtrl = require("../controllers/adminController");
const revenueCtrl =
require("../controllers/adminRevenueController");

router.get(
  "/revenue",
  verifyAdmin,
  revenueCtrl.getRevenueStats
);
router.get("/transactions", verifyAdmin, adminCtrl.getAllTransactions);
router.get("/transactions/status", verifyAdmin, adminCtrl.getTransactionsByStatus);
router.get("/transactions/:id", verifyAdmin, adminCtrl.getTransactionById);
router.post("/transactions/:id/verify", verifyAdmin, adminCtrl.verifyTransactionManually);
router.post("/users/reset-password", verifyAdmin,adminCtrl.resetUserPassword);
router.post("/wallet/credit", verifyAdmin,adminCtrl.creditUserWallet);
router.post("/wallet/debit", verifyAdmin,adminCtrl.debitUserWallet);
module.exports = router;