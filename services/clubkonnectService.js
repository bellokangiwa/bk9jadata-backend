const axios = require("axios");

// ================= ENV VARIABLES =================
// These come from your .env file
const USER_ID = process.env.CLUBKONNECT_USER_ID;
const API_KEY = process.env.CLUBKONNECT_API_KEY;
const AIRTIME_URL = process.env.CLUBKONNECT_AIRTIME_URL;
const DATA_URL = process.env.CLUBKONNECT_DATA_URL;
const DISCOUNT_URL = process.env.CLUBKONNECT_DISCOUNT_URL;

// ================= HELPER =======================
// Generates a unique RequestID for every transaction
function generateRequestID() {
  return "BK9JA_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
}

// ================= CLUBKONNECT SERVICE =================
const clubKonnectService = {

  // ================= GET AIRTIME SERVICES =================
  // This only fetches available airtime info (optional feature)
  getAirtimeServices: async () => {
    try {
      const response = await axios.get(DISCOUNT_URL, {
        params: {
          UserID: USER_ID,
        },
      });

      return response.data;
    } catch (err) {
      return { error: err.response?.data || err.message };
    }
  },

  // ================= BUY AIRTIME =================
  buyAirtime: async ({ network, amount, phone }) => {
    const requestId = generateRequestID();

    try {
      const response = await axios.get(AIRTIME_URL, {
        // IMPORTANT: axios params auto-encode values (prevents auth failure)
        params: {
          UserID: USER_ID,
          APIKey: API_KEY,
          MobileNetwork: network, // must be correct network code
          Amount: amount,
          MobileNumber: phone,
          RequestID: requestId,
        },
      });

      return {
        requestId,
        result: response.data,
      };
    } catch (err) {
      return {
        requestId,
        error: err.response?.data || err.message,
      };
    }
  },

  // ================= BUY DATA =================
  buyData: async ({ network, dataplan, phone }) => {
    const requestId = generateRequestID();

    try {
      const response = await axios.get(DATA_URL, {
        // SAME SAFE METHOD FOR DATA
        params: {
          UserID: USER_ID,
          APIKey: API_KEY,
          MobileNetwork: network, // must be numeric network code
          DataPlan: dataplan,     // must be correct plan code
          MobileNumber: phone,
          RequestID: requestId,
        },
      });

      return {
        requestId,
        result: response.data,
      };
    } catch (err) {
      return {
        requestId,
        error: err.response?.data || err.message,
      };
    }
  },

  // ================= VERIFY TRANSACTION =================
  verifyTransaction: async (requestId) => {
    try {
      const response = await axios.get(
        "https://www.nellobytesystems.com/APIQuery.asp",
        {
          params: {
            UserID: USER_ID,
            APIKey: API_KEY,
            RequestID: requestId,
          },
        }
      );

      return response.data;
    } catch (err) {
      return { error: err.response?.data || err.message };
    }
  },
};

module.exports = clubKonnectService;