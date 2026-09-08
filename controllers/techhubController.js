// controllers/techhubController.js
const {
  // ==========================================
  // NIN BY NIN
  // ==========================================
  lookupNINByNIN,
  lookupNINStandardSlipByNIN,
  lookupNINRegularSlipByNIN,
  lookupVNINSlipByNIN,

  // ==========================================
  // NIN WITH PHONE
  // ==========================================
  lookupNINByPhonePremium,
  lookupNINByPhoneStandard,
  lookupNINByPhoneRegular,

  // ==========================================
  // NIN BY DEMO
  // ==========================================
  lookupNINByDemo,
  lookupNINStandardSlipByDemo,
  lookupNINRegularSlipByDemo,
  lookupVNINSlipByDemo,

  // ==========================================
  // BVN
  // ==========================================
  lookupBVNPremiumSlip,
  lookupBVNFull,

  // ==========================================
  // NIN VALIDATION
  // ==========================================
  validateNINTracking,
} = require("../services/techhubService");

const { executeKyc } = require("../services/kycBillingService");


// ========================================
// HELPER: PROVIDER ERROR RESPONSE
// ========================================

const handleProviderError = (res, error, serviceName) => {
  console.error(
    `${serviceName} Controller Error:`,
    error.response?.data || error.message
  );

  // ----------------------------------------
  // WALLET / KYC BILLING ERRORS
  // ----------------------------------------

  if (error.code === "INSUFFICIENT_FUNDS") {
    return res.status(400).json({
      success: false,
      message: "Insufficient wallet balance",
    });
  }

  if (error.code === "KYC_SERVICE_NOT_FOUND") {
    return res.status(404).json({
      success: false,
      message: "KYC service not found",
    });
  }

  if (error.code === "KYC_SERVICE_INACTIVE") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error.code === "INVALID_KYC_PRICE") {
    return res.status(500).json({
      success: false,
      message: "Invalid KYC service price",
    });
  }

  if (error.code === "INVALID_PROVIDER_COST") {
    return res.status(500).json({
      success: false,
      message: "Invalid TechHub service cost",
    });
  }

  if (error.code === "WALLET_DEBIT_FAILED") {
    return res.status(400).json({
      success: false,
      message: "Unable to debit wallet",
    });
  }

  // ----------------------------------------
  // TECHHUB ERROR
  // ----------------------------------------

  if (error.response) {
    return res.status(error.response.status || 500).json({
      success: false,
      message:
        error.response.data?.message ||
        `${serviceName} failed`,
      error: error.response.data,
    });
  }

  // ----------------------------------------
  // GENERAL ERROR
  // ----------------------------------------

  return res.status(500).json({
    success: false,
    message:
      error.message ||
      `Unable to process ${serviceName}`,
  });
};


// ========================================
// AUTHENTICATION HELPER
// ========================================

const getAuthenticatedUser = (req, res) => {
  const uid = req.auth?.uid;

  if (!uid) {
    res.status(401).json({
      success: false,
      message: "Not authenticated",
    });

    return null;
  }

  return uid;
};


// ========================================
// NIN BY NIN
// ========================================


// ========================================
// 1. NIN BY NIN
// POST /api/kyc/nin
// ========================================

const verifyNIN = async (req, res) => {
  try {
    const uid = getAuthenticatedUser(req, res);

    if (!uid) return;

    const { nin } = req.body;

    if (!nin) {
      return res.status(400).json({
        success: false,
        message: "NIN is required",
      });
    }

    const ninValue = String(nin).trim();

    if (!/^\d{11}$/.test(ninValue)) {
      return res.status(400).json({
        success: false,
        message: "NIN must be exactly 11 digits",
      });
    }

    const result = await executeKyc({
      userId: uid,

      service: "nin_basic",

      techhubRequest: () =>
        lookupNINByNIN(ninValue),
    });

    return res.status(200).json(result);

  } catch (error) {
    return handleProviderError(
      res,
      error,
      "NIN verification"
    );
  }
};


// ========================================
// 2. NIN STANDARD SLIP BY NIN
// POST /api/kyc/nin-standard-slip
// ========================================

const verifyNINSlip = async (req, res) => {
  try {
    const uid = getAuthenticatedUser(req, res);

    if (!uid) return;

    const { nin } = req.body;

    if (!nin) {
      return res.status(400).json({
        success: false,
        message: "NIN is required",
      });
    }

    const ninValue = String(nin).trim();

    if (!/^\d{11}$/.test(ninValue)) {
      return res.status(400).json({
        success: false,
        message: "NIN must be exactly 11 digits",
      });
    }

    const result = await executeKyc({
      userId: uid,

      service: "nin_standard_slip",

      techhubRequest: () =>
        lookupNINStandardSlipByNIN(ninValue),
    });

    return res.status(200).json(result);

  } catch (error) {
    return handleProviderError(
      res,
      error,
      "NIN Standard Slip"
    );
  }
};


// ========================================
// 3. NIN REGULAR SLIP BY NIN
// POST /api/kyc/nin-regular-slip
// ========================================

const verifyNINRegularSlip = async (req, res) => {
  try {
    const uid = getAuthenticatedUser(req, res);

    if (!uid) return;

    const { nin } = req.body;

    if (!nin) {
      return res.status(400).json({
        success: false,
        message: "NIN is required",
      });
    }

    const ninValue = String(nin).trim();

    if (!/^\d{11}$/.test(ninValue)) {
      return res.status(400).json({
        success: false,
        message: "NIN must be exactly 11 digits",
      });
    }

    const result = await executeKyc({
      userId: uid,

      service: "nin_regular_slip",

      techhubRequest: () =>
        lookupNINRegularSlipByNIN(ninValue),
    });

    return res.status(200).json(result);

  } catch (error) {
    return handleProviderError(
      res,
      error,
      "NIN Regular Slip"
    );
  }
};


// ========================================
// 4. VNIN SLIP BY NIN
// POST /api/kyc/vnin-slip
// ========================================

const verifyVNINSlip = async (req, res) => {
  try {
    const uid = getAuthenticatedUser(req, res);

    if (!uid) return;

    const { nin } = req.body;

    if (!nin) {
      return res.status(400).json({
        success: false,
        message: "NIN is required",
      });
    }

    const ninValue = String(nin).trim();

    if (!/^\d{11}$/.test(ninValue)) {
      return res.status(400).json({
        success: false,
        message: "NIN must be exactly 11 digits",
      });
    }

    const result = await executeKyc({
      userId: uid,

      service: "nin_vnin_slip",

      techhubRequest: () =>
        lookupVNINSlipByNIN(ninValue),
    });

    return res.status(200).json(result);

  } catch (error) {
    return handleProviderError(
      res,
      error,
      "VNIN Slip"
    );
  }
};


// ========================================
// NIN WITH PHONE
// ========================================


// ========================================
// 1. NIN BY PHONE - PREMIUM
// POST /api/kyc/nin-by-phone-premium
// ========================================

const verifyNINByPhonePremium = async (req, res) => {
  try {
    const uid = getAuthenticatedUser(req, res);

    if (!uid) return;

    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const phoneValue = String(phone).trim();

    if (!/^0\d{10}$/.test(phoneValue)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be exactly 11 digits",
      });
    }

    const result = await executeKyc({
      userId: uid,

      service: "nin_phone_premium",

      techhubRequest: () =>
        lookupNINByPhonePremium(phoneValue),
    });

    return res.status(200).json(result);

  } catch (error) {
    return handleProviderError(
      res,
      error,
      "NIN by Phone Premium"
    );
  }
};


// ========================================
// 2. NIN BY PHONE - STANDARD
// POST /api/kyc/nin-by-phone-standard
// ========================================

const verifyNINByPhoneStandard = async (req, res) => {
  try {
    const uid = getAuthenticatedUser(req, res);

    if (!uid) return;

    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const phoneValue = String(phone).trim();

    if (!/^0\d{10}$/.test(phoneValue)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be exactly 11 digits",
      });
    }

    const result = await executeKyc({
      userId: uid,

      service: "nin_phone_standard",

      techhubRequest: () =>
        lookupNINByPhoneStandard(phoneValue),
    });

    return res.status(200).json(result);

  } catch (error) {
    return handleProviderError(
      res,
      error,
      "NIN by Phone Standard"
    );
  }
};


// ========================================
// 3. NIN BY PHONE - REGULAR
// POST /api/kyc/nin-by-phone-regular
// ========================================

const verifyNINByPhoneRegular = async (req, res) => {
  try {
    const uid = getAuthenticatedUser(req, res);

    if (!uid) return;

    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const phoneValue = String(phone).trim();

    if (!/^0\d{10}$/.test(phoneValue)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be exactly 11 digits",
      });
    }

    const result = await executeKyc({
      userId: uid,

      service: "nin_phone_regular",

      techhubRequest: () =>
        lookupNINByPhoneRegular(phoneValue),
    });

    return res.status(200).json(result);

  } catch (error) {
    return handleProviderError(
      res,
      error,
      "NIN by Phone Regular"
    );
  }
};


// ========================================
// NIN BY DEMO
// ========================================


// ========================================
// HELPER: VALIDATE DEMO DATA
// ========================================

const getDemoData = (req, res) => {
  const {
    firstname,
    lastname,
    dob,
    gender,
  } = req.body;

  if (!firstname) {
    res.status(400).json({
      success: false,
      message: "First name is required",
    });

    return null;
  }

  if (!lastname) {
    res.status(400).json({
      success: false,
      message: "Last name is required",
    });

    return null;
  }

  if (!dob) {
    res.status(400).json({
      success: false,
      message: "Date of birth is required",
    });

    return null;
  }

  if (!gender) {
    res.status(400).json({
      success: false,
      message: "Gender is required",
    });

    return null;
  }

  const firstnameValue = String(firstname).trim();
  const lastnameValue = String(lastname).trim();
  const dobValue = String(dob).trim();
  const genderValue = String(gender).trim();

  // TechHub format: DD-MM-YYYY
  if (!/^\d{2}-\d{2}-\d{4}$/.test(dobValue)) {
    res.status(400).json({
      success: false,
      message:
        "Date of birth must be in DD-MM-YYYY format",
    });

    return null;
  }

  return {
    firstname: firstnameValue,
    lastname: lastnameValue,
    dob: dobValue,
    gender: genderValue,
  };
};


// ========================================
// 1. NIN BY DEMO
// POST /api/kyc/nin-by-demo
// ========================================

const verifyNINByDemo = async (req, res) => {
  try {
    const uid = getAuthenticatedUser(req, res);

    if (!uid) return;

    const demo = getDemoData(req, res);

    if (!demo) return;

    const result = await executeKyc({
      userId: uid,

      service: "nin_demo",

      techhubRequest: () =>
        lookupNINByDemo(
          demo.firstname,
          demo.lastname,
          demo.dob,
          demo.gender
        ),
    });

    return res.status(200).json(result);

  } catch (error) {
    return handleProviderError(
      res,
      error,
      "NIN by Demo"
    );
  }
};


// ========================================
// 2. NIN STANDARD SLIP BY DEMO
// POST /api/kyc/nin-demo-standard-slip
// ========================================

const verifyNINStandardSlipByDemo = async (req, res) => {
  try {
    const uid = getAuthenticatedUser(req, res);

    if (!uid) return;

    const demo = getDemoData(req, res);

    if (!demo) return;

    const result = await executeKyc({
      userId: uid,

      service: "nin_demo_standard_slip",

      techhubRequest: () =>
        lookupNINStandardSlipByDemo(
          demo.firstname,
          demo.lastname,
          demo.dob,
          demo.gender
        ),
    });

    return res.status(200).json(result);

  } catch (error) {
    return handleProviderError(
      res,
      error,
      "NIN Demo Standard Slip"
    );
  }
};


// ========================================
// 3. NIN REGULAR SLIP BY DEMO
// POST /api/kyc/nin-demo-regular-slip
// ========================================

const verifyNINRegularSlipByDemo = async (req, res) => {
  try {
    const uid = getAuthenticatedUser(req, res);

    if (!uid) return;

    const demo = getDemoData(req, res);

    if (!demo) return;

    const result = await executeKyc({
      userId: uid,

      service: "nin_demo_regular_slip",

      techhubRequest: () =>
        lookupNINRegularSlipByDemo(
          demo.firstname,
          demo.lastname,
          demo.dob,
          demo.gender
        ),
    });

    return res.status(200).json(result);

  } catch (error) {
    return handleProviderError(
      res,
      error,
      "NIN Demo Regular Slip"
    );
  }
};


// ========================================
// 4. VNIN SLIP BY DEMO
// POST /api/kyc/nin-demo-vnin-slip
// ========================================

const verifyVNINSlipByDemo = async (req, res) => {
  try {
    const uid = getAuthenticatedUser(req, res);

    if (!uid) return;

    const demo = getDemoData(req, res);

    if (!demo) return;

    const result = await executeKyc({
      userId: uid,

      service: "nin_demo_vnin_slip",

      techhubRequest: () =>
        lookupVNINSlipByDemo(
          demo.firstname,
          demo.lastname,
          demo.dob,
          demo.gender
        ),
    });

    return res.status(200).json(result);

  } catch (error) {
    return handleProviderError(
      res,
      error,
      "NIN Demo VNIN Slip"
    );
  }
};


// ========================================
// BVN
// ========================================


// ========================================
// 1. BVN PREMIUM SLIP
// POST /api/kyc/bvn-premium-slip
// ========================================

const verifyBVNPremiumSlip = async (req, res) => {
  try {
    const uid = getAuthenticatedUser(req, res);

    if (!uid) return;

    const { bvn } = req.body;

    if (!bvn) {
      return res.status(400).json({
        success: false,
        message: "BVN is required",
      });
    }

    const bvnValue = String(bvn).trim();

    if (!/^\d{11}$/.test(bvnValue)) {
      return res.status(400).json({
        success: false,
        message: "BVN must be exactly 11 digits",
      });
    }

    const result = await executeKyc({
      userId: uid,

      service: "bvn_premium",

      techhubRequest: () =>
        lookupBVNPremiumSlip(bvnValue),
    });

    return res.status(200).json(result);

  } catch (error) {
    return handleProviderError(
      res,
      error,
      "BVN Premium Slip"
    );
  }
};


// ========================================
// 2. BVN FULL DETAILS SLIP
// POST /api/kyc/bvn-full
// ========================================

const verifyBVNFull = async (req, res) => {
  try {
    const uid = getAuthenticatedUser(req, res);

    if (!uid) return;

    const { bvn } = req.body;

    if (!bvn) {
      return res.status(400).json({
        success: false,
        message: "BVN is required",
      });
    }

    const bvnValue = String(bvn).trim();

    if (!/^\d{11}$/.test(bvnValue)) {
      return res.status(400).json({
        success: false,
        message: "BVN must be exactly 11 digits",
      });
    }

    const result = await executeKyc({
      userId: uid,

      service: "bvn_full",

      techhubRequest: () =>
        lookupBVNFull(bvnValue),
    });

    return res.status(200).json(result);

  } catch (error) {
    return handleProviderError(
      res,
      error,
      "BVN Full Details Slip"
    );
  }
};


// ========================================
// NIN VALIDATION / TRACKING
// ========================================
//
// GET /api/kyc/nin-validation/:ticketId
//
// This endpoint does NOT charge the wallet.
// It only checks the TechHub validation ticket.
// ========================================

const getNINValidationTicketId = async (req, res) => {
  try {
    const uid = getAuthenticatedUser(req, res);

    if (!uid) return;

    const { ticketId } = req.params;

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: "Ticket ID is required",
      });
    }

    const result = await validateNINTracking(ticketId);

    return res.status(200).json({
      success: true,
      message:
        "NIN validation status retrieved successfully",
      data: result,
    });

  } catch (error) {
    return handleProviderError(
      res,
      error,
      "NIN validation"
    );
  }
};


// ========================================
// EXPORTS
// ========================================

module.exports = {

  // ----------------------------------------
  // NIN BY NIN
  // ----------------------------------------

  verifyNIN,
  verifyNINSlip,
  verifyNINRegularSlip,
  verifyVNINSlip,


  // ----------------------------------------
  // NIN WITH PHONE
  // ----------------------------------------

  verifyNINByPhonePremium,
  verifyNINByPhoneStandard,
  verifyNINByPhoneRegular,


  // ----------------------------------------
  // NIN BY DEMO
  // ----------------------------------------

  verifyNINByDemo,
  verifyNINStandardSlipByDemo,
  verifyNINRegularSlipByDemo,
  verifyVNINSlipByDemo,


  // ----------------------------------------
  // BVN
  // ----------------------------------------

  verifyBVNPremiumSlip,
  verifyBVNFull,


  // ----------------------------------------
  // NIN VALIDATION
  // ----------------------------------------

  getNINValidationTicketId,
};
