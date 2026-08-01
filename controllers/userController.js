const admin = require("firebase-admin");
// =========================
// USER CHANGE PASSWORD
// =========================
exports.changePassword = async (req, res) => {
  try {
    const uid = req.auth.uid;

    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        error: "New password is required",
      });
    }

    // Only allow exactly 6 digits
    if (!/^\d{6}$/.test(newPassword)) {
      return res.status(400).json({
        error: "Password must be exactly 6 digits",
      });
    }

    // Update Firebase Authentication password
    await admin.auth().updateUser(uid, {
      password: newPassword,
    });

    // Update Firestore
    await admin
        .firestore()
        .collection("users")
        .doc(uid)
        .update({
          mustChangePassword: false,
        });

    return res.json({
      success: true,
      message: "Password changed successfully",
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      error: err.message,
    });

  }
};

//=========================================
// SAVE FCM TOKEN
//=========================================
exports.saveFcmToken = async (req, res) => {

  try {

    const uid = req.auth.uid;

    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Token is required",
      });
    }

    await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .set(
        {
          fcmToken: token,
          lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return res.json({
      success: true,
      message: "FCM token saved successfully",
    });

  } catch (e) {

    console.error(e);

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });

  }

};