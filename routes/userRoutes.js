const express = require("express");

const router = express.Router();

const verifyUser = require("../middleware/authFirebase");

const userController = require("../controllers/userController");

router.post(
  "/change-password",
  verifyUser,
  userController.changePassword
);
router.post(
  "/save-fcm-token",
  verifyUser,
  userController.saveFcmToken
);

module.exports = router;