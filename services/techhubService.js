const axios = require("axios");

// ==========================================
// TECHHUB ENVIRONMENT
// ==========================================

const TECHHUB_BASE_URL =
  process.env.TECHHUB_BASE_URL || "https://techhubltd.co";

const TECHHUB_API_KEY = process.env.TECHHUB_API_KEY;


// ==========================================
// COMMON TECHHUB REQUEST
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


// ==========================================
// NIN BY NIN
// ==========================================

const lookupNIN = async (nin) => {
  return await techhubPost("nin_by_nin.php", {
    nin,
  });
};


// ==========================================
// NIN STANDARD SLIP
// ==========================================

const lookupNINSlip = async (nin) => {
  return await techhubPost("nin_standard_slip.php", {
    nin,
  });
};


// ==========================================
// NIN REGULAR SLIP
// ==========================================

const lookupNINRegularSlip = async (nin) => {
  return await techhubPost("nin_regular_slip.php", {
    nin,
  });
};


// ==========================================
// VNIN SLIP
// ==========================================

const lookupVNINSlip = async (nin) => {
  return await techhubPost("vnin_slip.php", {
    nin,
  });
};


// ==========================================
// NIN BY PHONE - PREMIUM
// ==========================================

const lookupNINByPhonePremium = async (phone) => {
  return await techhubPost("nin_by_phone_premium.php", {
    phone,
  });
};


// ==========================================
// NIN BY PHONE - STANDARD
// ==========================================

const lookupNINByPhoneStandard = async (phone) => {
  return await techhubPost("nin_by_phone_standard.php", {
    phone,
  });
};


// ==========================================
// NIN BY PHONE - REGULAR
// ==========================================

const lookupNINByPhoneRegular = async (phone) => {
  return await techhubPost("nin_by_phone_regular.php", {
    phone,
  });
};


// ==========================================
// NIN BY DEMO
// ==========================================

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


// ==========================================
// BVN PREMIUM SLIP
// ==========================================

const lookupBVNPremiumSlip = async (bvn) => {
  return await techhubPost("bvn_premium_slip.php", {
    bvn,
  });
};


// ==========================================
// BVN FULL DETAILS SLIP
// ==========================================

const lookupBVNFull = async (bvn) => {
  return await techhubPost("bvn_full_details_slip.php", {
    bvn,
  });
};


// ==========================================
// NIN VALIDATION / TRACKING
// ==========================================

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


// ==========================================
// EXPORT
// ==========================================

module.exports = {
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
};