const express = require("express");

const router = express.Router();

const verifyFirebaseToken = require("../middleware/authFirebase");
const upload = require("../middleware/uploadProfileImage");
const profileController = require("../controllers/profileController");

// ==========================================
// Upload Profile Photo
// ==========================================
router.post(
  "/upload-photo",
  verifyFirebaseToken,
  upload.single("image"),
  profileController.uploadProfilePhoto
);

module.exports = router;