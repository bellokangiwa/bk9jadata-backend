const multer = require("multer");
const path = require("path");

// Store images on disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/profile-images");
  },

  filename: (req, file, cb) => {
  // Always keep one profile picture per user
  cb(null, `${req.auth.uid}.jpg`);
},
});

// Allow only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed."));
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB
  },
});