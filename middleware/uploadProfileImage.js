const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ==========================================
// PROFILE IMAGE UPLOAD DIRECTORY
// ==========================================

const uploadDirectory = path.join(
  __dirname,
  "..",
  "uploads",
  "profile-images"
);

// Automatically create the folders if they don't exist
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });

  console.log(
    "Profile image upload directory created:",
    uploadDirectory
  );
}

// ==========================================
// MULTER STORAGE
// ==========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    // One profile picture per Firebase user
    cb(null, `${req.auth.uid}.jpg`);
  },
});

// ==========================================
// ALLOW ONLY IMAGE FILES
// ==========================================

const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed."));
  }
};

// ==========================================
// MULTER CONFIGURATION
// ==========================================

const upload = multer({
  storage: storage,

  fileFilter: fileFilter,

  limits: {
    fileSize: 3 * 1024 * 1024, // Maximum 3MB
  },
});

module.exports = upload;