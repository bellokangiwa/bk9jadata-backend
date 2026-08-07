const admin = require("firebase-admin");

// ===========================================
// UPLOAD PROFILE PHOTO
// ===========================================
exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image uploaded.",
      });
    }

    const uid = req.auth.uid;

    // Build public image URL
    const imageUrl =
      `${req.protocol}://${req.get("host")}/uploads/profile-images/${req.file.filename}`;

    // Save image URL in Firestore
    await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .update({
        profileImage: imageUrl,
      });

    return res.status(200).json({
      success: true,
      message: "Profile picture uploaded successfully.",
      imageUrl,
    });

  } catch (error) {
    console.error("Profile upload error:", error);

    return res.status(500).json({
      success: false,
      error: "Internal server error.",
    });
  }
};