const express = require("express");

const router = express.Router();

const verifyUser = require("../middleware/authFirebase");

const userController = require("../controllers/userController");

router.post(
  "/change-password",
  verifyUser,
  userController.changePassword
);

module.exports = router;