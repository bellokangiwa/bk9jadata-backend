const admin = require("firebase-admin");
const cloudinary = require("cloudinary").v2;

// ===========================================
// CLOUDINARY CONFIGURATION
// ===========================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ===========================================
// UPLOAD PROFILE PHOTO
// ===========================================

exports.uploadProfilePhoto = async (req, res) => {
  try {
    console.log("====================================");
    console.log("PROFILE PHOTO CONTROLLER");
    console.log("Firebase UID:", req.auth.uid);
    console.log("====================================");

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image uploaded.",
      });
    }

    const uid = req.auth.uid;

    console.log("Image received.");
    console.log("Original name:", req.file.originalname);
    console.log("Mimetype:", req.file.mimetype);
    console.log("Size:", req.file.size);

    // ==========================================
    // UPLOAD BUFFER TO CLOUDINARY
    // ==========================================

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "bk9jadatasub/profile-images",

          // Firebase UID = permanent Cloudinary public ID
          public_id: uid,

          resource_type: "image",

          overwrite: true,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      stream.end(req.file.buffer);
    });

    console.log("====================================");
    console.log("CLOUDINARY UPLOAD SUCCESS");
    console.log("Public ID:", uploadResult.public_id);
    console.log("Image URL:", uploadResult.secure_url);
    console.log("====================================");

    const imageUrl = uploadResult.secure_url;

    // ==========================================
    // SAVE CLOUDINARY URL TO FIRESTORE
    // ==========================================

    await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .update({
        profileImage: imageUrl,
        profileImageUpdatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log("Profile image saved to Firestore successfully.");

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message: "Profile picture uploaded successfully.",
      imageUrl: imageUrl,
    });
  } catch (error) {
    console.error("====================================");
    console.error("PROFILE IMAGE UPLOAD ERROR");
    console.error(error);
    console.error("====================================");

    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error.",
    });
  }
};