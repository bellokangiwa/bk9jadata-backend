const Notification = require("../models/notification");
const createAdminLog = require("../utils/adminLog");
const admin = require("firebase-admin");
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
  createdBy: req.admin?.email || "Admin",
});
//--------------------------------------------------
// SEND PUSH NOTIFICATION
//--------------------------------------------------

const tokens = [];

//==================================================
// SEND TO ALL USERS
//==================================================
if (target === "all") {

  const usersSnapshot = await admin
    .firestore()
    .collection("users")
    .get();

  usersSnapshot.forEach((doc) => {
    const data = doc.data();

    if (data.fcmToken) {
      tokens.push(data.fcmToken);
    }
  });

}

//==================================================
// SEND TO SINGLE USER
//==================================================
else if (target === "single") {

  const userDoc = await admin
    .firestore()
    .collection("users")
    .doc(targetUser)
    .get();

  if (userDoc.exists) {

    const data = userDoc.data();

    if (data.fcmToken) {
      tokens.push(data.fcmToken);
    }

  }

}

//==================================================
// SEND TO SELECTED USERS
//==================================================
else if (target === "selected") {

  for (const uid of targetUsers) {

    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .get();

    if (userDoc.exists) {

      const data = userDoc.data();

      if (data.fcmToken) {
        tokens.push(data.fcmToken);
      }

    }

  }

}

//==================================================
// REMOVE DUPLICATE TOKENS
//==================================================
const uniqueTokens = [...new Set(tokens)];

console.log(`Collected ${uniqueTokens.length} FCM token(s).`);

//==================================================
// SEND PUSH NOTIFICATION
//==================================================
if (uniqueTokens.length > 0) {

  try {

    const response = await admin.messaging().sendEachForMulticast({

      tokens: uniqueTokens,

      notification: {
        title: title,
        body: message,
      },

      webpush: {
        notification: {
          title: title,
          body: message,
          icon: "https://www.bk9jadatasub.com/icons/Icon-192.png",
          badge: "https://www.bk9jadatasub.com/icons/Icon-192.png",
          image: image || undefined,
        },

        fcmOptions: {
          link: "https://www.bk9jadatasub.com",
        },
      },

      data: {
        type: type,
        priority: priority,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },

    });

    console.log(
      `Push Notification: ${response.successCount} success, ${response.failureCount} failed`
    );

    //------------------------------------------------
    // REMOVE INVALID TOKENS
    //------------------------------------------------

    response.responses.forEach((result, index) => {

      if (!result.success) {

        console.log(
          "Invalid Token:",
          uniqueTokens[index]
        );

      }

    });

  } catch (err) {

    console.error(
      "FCM Send Error:",
      err.message
    );

  }

} else {

  console.log("No FCM tokens found.");

}// ===== SAVE ADMIN ACTIVITY =====
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
const formattedNotifications = notifications.map((notification) => ({
  ...notification.toObject(),
  isRead: notification.readBy.includes(uid),
}));

return res.json({
  success: true,
  count: formattedNotifications.length,
  notifications: formattedNotifications,
});

  } catch (error) {

    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      error: "Internal server error.",
    });

  }
};
// ===========================================
// GET UNREAD NOTIFICATION COUNT
// ===========================================
exports.getUnreadCount = async (req, res) => {
  try {
    const uid = req.auth.uid;

    const count = await Notification.countDocuments({
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

      // User has NOT read this notification
      readBy: {
        $ne: uid,
      },
    });

    return res.json({
      success: true,
      count,
    });

  } catch (error) {

    console.error("Unread count error:", error);

    return res.status(500).json({
      success: false,
      error: "Internal server error.",
    });

  }
};
// ===========================================
// MARK NOTIFICATION AS READ
// ===========================================
exports.markAsRead = async (req, res) => {
  try {

    const uid = req.auth.uid;
    const notificationId = req.params.id;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: "Notification not found.",
      });
    }

    // Prevent duplicate entries
    if (!notification.readBy.includes(uid)) {
      notification.readBy.push(uid);
      await notification.save();
    }

    return res.json({
      success: true,
      message: "Notification marked as read.",
    });

  } catch (error) {

    console.error("Mark as read error:", error);

    return res.status(500).json({
      success: false,
      error: "Internal server error.",
    });

  }
};