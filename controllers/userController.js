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