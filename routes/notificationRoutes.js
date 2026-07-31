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
// ==========================================
// USER - GET UNREAD COUNT
// ==========================================
router.get(
  "/notifications/unread-count",
  verifyUser,
  notificationController.getUnreadCount
);
// ==========================================
// USER - MARK AS READ
// ==========================================
router.post(
  "/notifications/read/:id",
  verifyUser,
  notificationController.markAsRead
);
module.exports = router;