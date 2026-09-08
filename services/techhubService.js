const axios = require("axios");

// ==========================================
// TECHHUB ENVIRONMENT
// ==========================================

const TECHHUB_BASE_URL =
  process.env.TECHHUB_BASE_URL || "https://techhubltd.co";

const TECHHUB_API_KEY = process.env.TECHHUB_API_KEY;


// ==========================================
// COMMON TECHHUB POST REQUEST
// ==========================================

const techhubPost = async (endpoint, payload = {}) => {
  try {
    if (!TECHHUB_API_KEY) {
      throw new Error("TECHHUB_API_KEY is not configured");
    }

    const response = await axios.post(
      `${TECHHUB_BASE_URL}/api/verification/${endpoint}`,
      {
        api_key: TECHHUB_API_KEY,
        ...payload,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 30000,
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      `TechHub ${endpoint} Error:`,
      error.response?.data || error.message
    );

    throw error;
  }
};


// ==========================================================
// NIN BY NIN
// ==========================================================

// 1. NIN BY NIN
const lookupNINByNIN = async (nin) => {
  return await techhubPost("nin_by_nin.php", {
    nin,
  });
};


// 2. NIN STANDARD SLIP BY NIN
const lookupNINStandardSlipByNIN = async (nin) => {
  return await techhubPost("nin_standard_slip.php", {
    nin,
  });
};


// 3. NIN REGULAR SLIP BY NIN
const lookupNINRegularSlipByNIN = async (nin) => {
  return await techhubPost("nin_regular_slip.php", {
    nin,
  });
};


// 4. VNIN SLIP BY NIN
const lookupVNINSlipByNIN = async (nin) => {
  return await techhubPost("vnin_slip.php", {
    nin,
  });
};


// ==========================================================
// NIN WITH PHONE
// ==========================================================

// 1. NIN BY PHONE - PREMIUM
const lookupNINByPhonePremium = async (phone) => {
  return await techhubPost("nin_by_phone_premium.php", {
    phone,
  });
};


// 2. NIN BY PHONE - STANDARD
const lookupNINByPhoneStandard = async (phone) => {
  return await techhubPost("nin_by_phone_standard.php", {
    phone,
  });
};


// 3. NIN BY PHONE - REGULAR
const lookupNINByPhoneRegular = async (phone) => {
  return await techhubPost("nin_by_phone_regular.php", {
    phone,
  });
};


// ==========================================================
// NIN BY DEMO
// ==========================================================

// Common demographic parameters:
//
// firstname
// lastname
// dob
// gender
//
// Example:
// firstname: "Bello"
// lastname: "Kangiwa"
// dob: "01-01-2000"
// gender: "Male"


// 1. NIN BY DEMO
const lookupNINByDemo = async (
  firstname,
  lastname,
  dob,
  gender
) => {
  return await techhubPost("nin_by_demo.php", {
    firstname,
    lastname,
    dob,
    gender,
  });
};


// 2. NIN STANDARD SLIP BY DEMO
const lookupNINStandardSlipByDemo = async (
  firstname,
  lastname,
  dob,
  gender
) => {
  return await techhubPost("nin_standard_slip.php", {
    firstname,
    lastname,
    dob,
    gender,
  });
};


// 3. NIN REGULAR SLIP BY DEMO
const lookupNINRegularSlipByDemo = async (
  firstname,
  lastname,
  dob,
  gender
) => {
  return await techhubPost("nin_regular_slip.php", {
    firstname,
    lastname,
    dob,
    gender,
  });
};


// 4. VNIN SLIP BY DEMO
const lookupVNINSlipByDemo = async (
  firstname,
  lastname,
  dob,
  gender
) => {
  return await techhubPost("vnin_slip.php", {
    firstname,
    lastname,
    dob,
    gender,
  });
};


// ==========================================================
// BVN SERVICES
// ==========================================================

// 1. BVN PREMIUM SLIP
const lookupBVNPremiumSlip = async (bvn) => {
  return await techhubPost("bvn_premium_slip.php", {
    bvn,
  });
};


// 2. BVN FULL DETAILS SLIP
const lookupBVNFull = async (bvn) => {
  return await techhubPost("bvn_full_details_slip.php", {
    bvn,
  });
};


// ==========================================================
// NIN VALIDATION / TRACKING
// ==========================================================

const validateNINTracking = async (ticketId) => {
  try {
    if (!TECHHUB_API_KEY) {
      throw new Error("TECHHUB_API_KEY is not configured");
    }

    const response = await axios.get(
      `${TECHHUB_BASE_URL}/api/verification/nin_validation.php`,
      {
        params: {
          api_key: TECHHUB_API_KEY,
          ticket_id: ticketId,
        },
        timeout: 30000,
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "TechHub NIN Validation Error:",
      error.response?.data || error.message
    );

    throw error;
  }
};


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

  // ------------------------------------------
  // NIN BY NIN
  // ------------------------------------------

  lookupNINByNIN,
  lookupNINStandardSlipByNIN,
  lookupNINRegularSlipByNIN,
  lookupVNINSlipByNIN,


  // ------------------------------------------
  // NIN WITH PHONE
  // ------------------------------------------

  lookupNINByPhonePremium,
  lookupNINByPhoneStandard,
  lookupNINByPhoneRegular,


  // ------------------------------------------
  // NIN BY DEMO
  // ------------------------------------------

  lookupNINByDemo,
  lookupNINStandardSlipByDemo,
  lookupNINRegularSlipByDemo,
  lookupVNINSlipByDemo,


  // ------------------------------------------
  // BVN
  // ------------------------------------------

  lookupBVNPremiumSlip,
  lookupBVNFull,


  // ------------------------------------------
  // NIN VALIDATION
  // ------------------------------------------

  validateNINTracking,
};
