const axios = require("axios");

// ================= ENV VARIABLES =================
const SMEPLUG_KEY = process.env.SMEPLUG_API_KEY;
const SMEPLUG_URL = process.env.SMEPLUG_URL;

// ================ HELPERS =======================
function generateRequestID() {
  return "BK9JA_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
}

// ================ SMEPLUG SERVICE =================
const smeplugService = {

  // BUY DATA
  buyData: async ({ networkCode, planCode, phone }) => {
    const requestId = generateRequestID();

    const url = `${SMEPLUG_URL}/buy?apiKey=${SMEPLUG_KEY}&network=${networkCode}&plan=${planCode}&phone=${phone}&requestId=${requestId}`;

    try {
      const response = await axios.get(url);
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

  // BUY AIRTIME
  buyAirtime: async ({ networkCode, amount, phone }) => {
    const requestId = generateRequestID();

    const url = `${SMEPLUG_URL}/airtime?apiKey=${SMEPLUG_KEY}&network=${networkCode}&amount=${amount}&phone=${phone}&requestId=${requestId}`;

    try {
      const response = await axios.get(url);
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

  // VERIFY TRANSACTION
  verifyTransaction: async (requestId) => {
    const url = `${SMEPLUG_URL}/verify?apiKey=${SMEPLUG_KEY}&requestId=${requestId}`;

    try {
      const response = await axios.get(url);
      return response.data;
    } catch (err) {
      return { error: err.response?.data || err.message };
    }
  },
};

module.exports = smeplugService;