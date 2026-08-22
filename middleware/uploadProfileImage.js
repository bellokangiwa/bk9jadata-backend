const multer = require("multer");

// ==========================================
// MULTER MEMORY STORAGE
// ==========================================
//
// IMPORTANT:
// We do NOT save the image to Render/local disk.
//
// Multer temporarily keeps the image in memory.
// Then the controller sends it directly to
// Cloudinary.
//

const storage = multer.memoryStorage();

// ==========================================
// IMAGE FILTER
// ==========================================

const fileFilter = (req, file, cb) => {
  console.log("====================================");
  console.log("PROFILE IMAGE UPLOAD");
  console.log("Original name:", file.originalname);
  console.log("Mimetype:", file.mimetype);
  console.log("====================================");

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
  storage: storage,

  fileFilter: fileFilter,

  limits: {
    fileSize: 3 * 1024 * 1024, // 3 MB
  },
});

module.exports = upload;