// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const verifyAdmin = require("../middleware/adminAuth");
const adminCtrl = require("../controllers/adminController");

router.get("/transactions", verifyAdmin, adminCtrl.getAllTransactions);
router.get("/transactions/status", verifyAdmin, adminCtrl.getTransactionsByStatus);
router.get("/transactions/:id", verifyAdmin, adminCtrl.getTransactionById);
router.post("/transactions/:id/verify", verifyAdmin, adminCtrl.verifyTransactionManually);
router.post(
  "/users/reset-password",
  verifyAdmin,
  adminCtrl.resetUserPassword
);

module.exports = router;