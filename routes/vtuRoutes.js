const express = require("express");
const router = express.Router();
const vtu = require("../controllers/vtuController");


// GET AVAILABLE AIRTIME SERVICES (OPTIONAL)
router.get("/airtime-services", vtu.getAirtimeServices);

// BUY AIRTIME
router.post("/buy-airtime", vtu.buyAirtime);

// BUY DATA
router.post("/buy-data", vtu.buyData);

// CHECK TRANSACTION STATUS
router.get("/verify/:request_id", vtu.verifyTransaction);

module.exports = router;
