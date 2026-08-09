const admin = require("firebase-admin");

// ===========================================
// UPLOAD PROFILE PHOTO
// ===========================================
exports.uploadProfilePhoto = async (req, res) => {
  try {
    console.log("====================================");
    console.log("PROFILE PHOTO UPLOAD");
    console.log("Firebase UID:", req.auth?.uid);
    console.log("File:", req.file);
    console.log("====================================");

    // Check authentication
    if (!req.auth || !req.auth.uid) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    // Check uploaded file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image uploaded.",
      });
    }

    const uid = req.auth.uid;

    // ===========================================
    // Build public image URL
    // ===========================================
    const imageUrl =
      `${req.protocol}://${req.get("host")}/uploads/profile-images/${req.file.filename}`;

    console.log("Image URL:", imageUrl);

    // ===========================================
    // SAVE IMAGE URL TO FIRESTORE
    // ===========================================
    await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .set(
        {
          profileImage: imageUrl,
          profileImageUpdatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        },
        {
          merge: true,
        }
      );

    console.log("Profile image saved to Firestore successfully.");

    // ===========================================
    // RESPONSE
    // ===========================================
    return res.status(200).json({
      success: true,
      message: "Profile picture uploaded successfully.",
      imageUrl: imageUrl,
    });

  } catch (error) {
    console.error("====================================");
    console.error("PROFILE UPLOAD ERROR:", error);
    console.error("====================================");

    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error.",
    });
  }
};