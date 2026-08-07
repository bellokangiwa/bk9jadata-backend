const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ==========================================
// CREATE UPLOAD FOLDER AUTOMATICALLY
// ==========================================

const uploadDir = path.join(
  __dirname,
  "..",
  "uploads",
  "profile-images"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });

  console.log("Created upload directory:", uploadDir);
}

// ==========================================
// STORAGE
// ==========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";

    // One profile picture per Firebase user
    cb(null, `${req.auth.uid}${ext}`);
  },
});

// ==========================================
// IMAGE FILTER
// ==========================================

const fileFilter = (req, file, cb) => {
  console.log("====================================");
  console.log("PROFILE IMAGE UPLOAD");
  console.log("Original name:", file.originalname);
  console.log("Mimetype:", file.mimetype);
  console.log("Size:", file.size);
  console.log("====================================");

  // Accept normal browser image MIME types
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  return cb(
    new Error(
      `Only image files are allowed. Received: ${file.mimetype}`
    ),
    false
  );
};

// ==========================================
// MULTER
// ==========================================

const upload = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: 3 * 1024 * 1024, // 3 MB
  },
});

module.exports = upload;