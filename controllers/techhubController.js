// controllers/techhubController.js

const {
  lookupNIN,
  lookupNINSlip,
  lookupNINRegularSlip,
  lookupVNINSlip,

  lookupNINByPhonePremium,
  lookupNINByPhoneStandard,
  lookupNINByPhoneRegular,

  lookupNINByDemo,

  lookupBVNPremiumSlip,
  lookupBVNFull,

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

  // -------------------------------
  // WALLET / KYC BILLING ERRORS
  // -------------------------------

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


  // -------------------------------
  // TECHHUB ERROR
  // -------------------------------

  if (error.response) {
    return res.status(error.response.status || 500).json({
      success: false,
      message:
        error.response.data?.message ||
        `${serviceName} failed`,
      error: error.response.data,
    });
  }


  // -------------------------------
  // GENERAL ERROR
  // -------------------------------

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
        lookupNIN(ninValue),
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
// NIN STANDARD SLIP
// POST /api/kyc/nin-slip
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

      service: "nin_slip",

      techhubRequest: () =>
        lookupNINSlip(ninValue),
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
// NIN REGULAR SLIP
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

      service: "nin_slip",

      techhubRequest: () =>
        lookupNINRegularSlip(ninValue),
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
// VNIN SLIP
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

      service: "nin_slip",

      techhubRequest: () =>
        lookupVNINSlip(ninValue),
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
// NIN BY PHONE - PREMIUM
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

      service: "phone_basic",

      techhubRequest: () =>
        lookupNINByPhonePremium(phoneValue),
    });


    return res.status(200).json(result);

  } catch (error) {

    return handleProviderError(
      res,
      error,
      "NIN by phone premium"
    );
  }
};


// ========================================
// NIN BY PHONE - STANDARD
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

      service: "phone_basic",

      techhubRequest: () =>
        lookupNINByPhoneStandard(phoneValue),
    });


    return res.status(200).json(result);

  } catch (error) {

    return handleProviderError(
      res,
      error,
      "NIN by phone standard"
    );
  }
};


// ========================================
// NIN BY PHONE - REGULAR
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

      service: "phone_basic",

      techhubRequest: () =>
        lookupNINByPhoneRegular(phoneValue),
    });


    return res.status(200).json(result);

  } catch (error) {

    return handleProviderError(
      res,
      error,
      "NIN by phone regular"
    );
  }
};


// ========================================
// NIN BY DEMO
// POST /api/kyc/nin-by-demo
// ========================================

const verifyNINByDemo = async (req, res) => {
  try {

    const uid = getAuthenticatedUser(req, res);

    if (!uid) return;


    const {
      firstname,
      lastname,
      dob,
      gender,
    } = req.body;


    if (!firstname) {
      return res.status(400).json({
        success: false,
        message: "First name is required",
      });
    }


    if (!lastname) {
      return res.status(400).json({
        success: false,
        message: "Last name is required",
      });
    }


    if (!dob) {
      return res.status(400).json({
        success: false,
        message: "Date of birth is required",
      });
    }


    if (!gender) {
      return res.status(400).json({
        success: false,
        message: "Gender is required",
      });
    }


    const firstnameValue =
      String(firstname).trim();

    const lastnameValue =
      String(lastname).trim();

    const dobValue =
      String(dob).trim();

    const genderValue =
      String(gender).trim();


    // TechHub format: DD-MM-YYYY
    if (!/^\d{2}-\d{2}-\d{4}$/.test(dobValue)) {
      return res.status(400).json({
        success: false,
        message:
          "Date of birth must be in DD-MM-YYYY format",
      });
    }


    const result = await executeKyc({
      userId: uid,

      service: "nin_basic",

      techhubRequest: () =>
        lookupNINByDemo(
          firstnameValue,
          lastnameValue,
          dobValue,
          genderValue
        ),
    });


    return res.status(200).json(result);

  } catch (error) {

    return handleProviderError(
      res,
      error,
      "NIN demo verification"
    );
  }
};


// ========================================
// BVN PREMIUM SLIP
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

      service: "bvn_full",

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
// BVN FULL DETAILS SLIP
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
// This endpoint only checks a TechHub ticket.
// It does NOT charge the wallet.
//
// GET /api/kyc/nin-validation/:ticketId
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


    const result =
      await validateNINTracking(ticketId);


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
};