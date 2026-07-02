const express = require("express");

const router = express.Router();

const notificationController = require("../controllers/notificationController");

const verifyAdmin = require("../middleware/adminAuth");
const verifyUser = require("../middleware/authFirebase");

// ===============================
// ADMIN
// ===============================

// Send notification
router.post(
  "/admin/notifications",
  verifyAdmin,
  notificationController.sendNotification
);

// ===============================
// USER
// ===============================

// Get notifications
router.get(
  "/notifications",
  verifyUser,
  notificationController.getNotifications
);

module.exports = router;