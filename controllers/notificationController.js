const Notification = require("../models/notification");

// ===========================================
// SEND NOTIFICATION (ADMIN)
// ===========================================
exports.sendNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      image,
      type,
      priority,
      target,
      targetUser,
      targetUsers,
      publishAt,
    } = req.body;

    // Validate required fields
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: "Title and message are required.",
      });
    }

    // Validate target
    if (target === "single" && !targetUser) {
      return res.status(400).json({
        success: false,
        error: "targetUser is required.",
      });
    }

    if (
      target === "selected" &&
      (!Array.isArray(targetUsers) || targetUsers.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        error: "targetUsers must contain at least one user.",
      });
    }

    const notification = await Notification.create({
  title,
  message,
  image: image || "",
  type: type || "general",
  priority: priority || "normal",
  target: target || "all",
  targetUser: targetUser || "",
  targetUsers: targetUsers || [],
  publishAt: publishAt || new Date(),
  createdBy: req.auth?.email || "Admin",
});

// ===== SAVE ADMIN ACTIVITY =====
await createAdminLog({
  action: "SEND_NOTIFICATION",
  adminUid: req.admin.uid,
  adminEmail: req.admin.email,
  targetUser: target === "all" ? "ALL_USERS" : (targetUser || "MULTIPLE_USERS"),
  details: `Title: ${title}`,
});

return res.status(201).json({
  success: true,
  message: "Notification sent successfully.",
  notification,
});

  } catch (error) {
    console.error("Send notification error:", error);

    return res.status(500).json({
      success: false,
      error: "Internal server error.",
    });
  }
};

// ===========================================
// GET NOTIFICATIONS (USER)
// ===========================================
exports.getNotifications = async (req, res) => {
  try {

    const uid = req.auth.uid;

    const notifications = await Notification.find({
      active: true,
      publishAt: { $lte: new Date() },
      $or: [
        { target: "all" },
        {
          target: "single",
          targetUser: uid,
        },
        {
          target: "selected",
          targetUsers: uid,
        },
      ],
    }).sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      count: notifications.length,
      notifications,
    });

  } catch (error) {

    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      error: "Internal server error.",
    });

  }
};