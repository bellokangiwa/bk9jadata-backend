const express = require("express");
const router = express.Router();
const vtu = require("../controllers/vtuController");
const verifyFirebaseToken = require("../middleware/authFirebase"); // ✅ Import Firebase auth middleware

// GET AVAILABLE AIRTIME SERVICES (OPTIONAL)
// No auth required for listing services
router.get("/airtime-services", vtu.getAirtimeServices);

// BUY AIRTIME
router.post("/buy-airtime", verifyFirebaseToken, vtu.buyAirtime);

// BUY DATA
router.post("/buy-data", verifyFirebaseToken, vtu.buyData);

// CHECK TRANSACTION STATUS
// Optional: you can require auth here too if you want only logged-in users to check
router.get("/verify/:request_id", verifyFirebaseToken, vtu.verifyTransaction);

module.exports = router;