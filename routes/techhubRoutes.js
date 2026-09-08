// routes/techhubRoutes.js
const express = require("express");

const router = express.Router();

const verifyFirebaseToken =
  require("../middleware/authFirebase");

const {
  // ==========================================
  // NIN BY NIN
  // ==========================================
  verifyNIN,
  verifyNINSlip,
  verifyNINRegularSlip,
  verifyVNINSlip,

  // ==========================================
  // NIN WITH PHONE
  // ==========================================
  verifyNINByPhonePremium,
  verifyNINByPhoneStandard,
  verifyNINByPhoneRegular,

  // ==========================================
  // NIN BY DEMO
  // ==========================================
  verifyNINByDemo,
  verifyNINStandardSlipByDemo,
  verifyNINRegularSlipByDemo,
  verifyVNINSlipByDemo,

  // ==========================================
  // BVN
  // ==========================================
  verifyBVNPremiumSlip,
  verifyBVNFull,

  // ==========================================
  // NIN VALIDATION
  // ==========================================
  getNINValidationTicketId,
} = require("../controllers/techhubController");


// ==========================================================
// NIN BY NIN
// ==========================================================

// 1. NIN BY NIN
// POST /api/kyc/nin
router.post(
  "/nin",
  verifyFirebaseToken,
  verifyNIN
);


// 2. NIN STANDARD SLIP BY NIN
// POST /api/kyc/nin-standard-slip
router.post(
  "/nin-standard-slip",
  verifyFirebaseToken,
  verifyNINSlip
);


// 3. NIN REGULAR SLIP BY NIN
// POST /api/kyc/nin-regular-slip
router.post(
  "/nin-regular-slip",
  verifyFirebaseToken,
  verifyNINRegularSlip
);


// 4. VNIN SLIP BY NIN
// POST /api/kyc/vnin-slip
router.post(
  "/vnin-slip",
  verifyFirebaseToken,
  verifyVNINSlip
);


// ==========================================================
// NIN WITH PHONE
// ==========================================================

// 1. NIN BY PHONE - PREMIUM
// POST /api/kyc/nin-by-phone-premium
router.post(
  "/nin-by-phone-premium",
  verifyFirebaseToken,
  verifyNINByPhonePremium
);


// 2. NIN BY PHONE - STANDARD
// POST /api/kyc/nin-by-phone-standard
router.post(
  "/nin-by-phone-standard",
  verifyFirebaseToken,
  verifyNINByPhoneStandard
);


// 3. NIN BY PHONE - REGULAR
// POST /api/kyc/nin-by-phone-regular
router.post(
  "/nin-by-phone-regular",
  verifyFirebaseToken,
  verifyNINByPhoneRegular
);


// ==========================================================
// NIN BY DEMO
// ==========================================================

// 1. NIN BY DEMO
// POST /api/kyc/nin-by-demo
router.post(
  "/nin-by-demo",
  verifyFirebaseToken,
  verifyNINByDemo
);


// 2. NIN STANDARD SLIP BY DEMO
// POST /api/kyc/nin-demo-standard-slip
router.post(
  "/nin-demo-standard-slip",
  verifyFirebaseToken,
  verifyNINStandardSlipByDemo
);
// 3. NIN REGULAR SLIP BY DEMO
// POST /api/kyc/nin-demo-regular-slip
router.post(
  "/nin-demo-regular-slip",
  verifyFirebaseToken,
  verifyNINRegularSlipByDemo
);


// 4. VNIN SLIP BY DEMO
// POST /api/kyc/nin-demo-vnin-slip
router.post(
  "/nin-demo-vnin-slip",
  verifyFirebaseToken,
  verifyVNINSlipByDemo
);

// ==========================================================
// BVN
// ==========================================================

// 1. BVN PREMIUM SLIP
// POST /api/kyc/bvn-premium-slip
router.post(
  "/bvn-premium-slip",
  verifyFirebaseToken,
  verifyBVNPremiumSlip
);

// 2. BVN FULL DETAILS SLIP
// POST /api/kyc/bvn-full
router.post(
  "/bvn-full",
  verifyFirebaseToken,
  verifyBVNFull
);


// ==========================================================
// NIN VALIDATION / TRACKING
// ==========================================================

// GET /api/kyc/nin-validation/:ticketId
router.get(
  "/nin-validation/:ticketId",
  verifyFirebaseToken,
  getNINValidationTicketId
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports = router;
