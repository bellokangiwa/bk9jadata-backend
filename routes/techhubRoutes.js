const express = require("express");

const router = express.Router();

const verifyFirebaseToken =
  require("../middleware/authFirebase");

const {
  verifyNIN,
  verifyNINSlip,
  verifyNINRegularSlip,
  verifyVNINSlip,

  verifyNINByPhonePremium,
  verifyNINByPhoneStandard,
  verifyNINByPhoneRegular,

  verifyNINByDemo,

  verifyBVNPremiumSlip,
  verifyBVNFull,

  getNINValidationTicketId,
} = require("../controllers/techhubController");


router.post(
  "/nin",
  verifyFirebaseToken,
  verifyNIN
);

router.post(
  "/nin-slip",
  verifyFirebaseToken,
  verifyNINSlip
);

router.post(
  "/nin-regular-slip",
  verifyFirebaseToken,
  verifyNINRegularSlip
);

router.post(
  "/vnin-slip",
  verifyFirebaseToken,
  verifyVNINSlip
);


router.post(
  "/nin-by-phone-premium",
  verifyFirebaseToken,
  verifyNINByPhonePremium
);

router.post(
  "/nin-by-phone-standard",
  verifyFirebaseToken,
  verifyNINByPhoneStandard
);

router.post(
  "/nin-by-phone-regular",
  verifyFirebaseToken,
  verifyNINByPhoneRegular
);


router.post(
  "/nin-by-demo",
  verifyFirebaseToken,
  verifyNINByDemo
);


router.post(
  "/bvn-premium-slip",
  verifyFirebaseToken,
  verifyBVNPremiumSlip
);

router.post(
  "/bvn-full",
  verifyFirebaseToken,
  verifyBVNFull
);


// Tracking/status endpoint
router.get(
  "/nin-validation/:ticketId",
  verifyFirebaseToken,
  getNINValidationTicketId
);


module.exports = router;