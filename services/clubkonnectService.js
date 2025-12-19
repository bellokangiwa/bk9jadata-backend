const axios = require("axios");

// ================= ENV VARIABLES =================
const USER_ID = process.env.CLUBKONNECT_USER_ID;
const API_KEY = process.env.CLUBKONNECT_API_KEY;
const AIRTIME_URL = process.env.CLUBKONNECT_AIRTIME_URL;
const DATA_URL = process.env.CLUBKONNECT_DATA_URL;
const DISCOUNT_URL = process.env.CLUBKONNECT_DISCOUNT_URL;

// ================ HELPERS =======================
function generateRequestID() {
  return "BK9JA_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
}

// ================ CLUBKONNECT SERVICE =================
const clubKonnectService = {

  // GET AIRTIME SERVICES (OPTIONAL)
  getAirtimeServices: async () => {
    try {
      const url = `${DISCOUNT_URL}?UserID=${USER_ID}`;
      const response = await axios.get(url);
      return response.data;
    } catch (err) {
      return { error: err.response?.data || err.message };
    }
  },

  // BUY AIRTIME
  buyAirtime: async ({ network, amount, phone }) => {
    const requestId = generateRequestID();
    const url =
      `${AIRTIME_URL}?UserID=${USER_ID}` +
      `&APIKey=${API_KEY}` +
      `&MobileNetwork=${network}` +
      `&Amount=${amount}` +
      `&MobileNumber=${phone}` +
      `&RequestID=${requestId}`;

    try {
      const response = await axios.get(url);
      return { requestId, result: response.data };
    } catch (err) {
      return { requestId, error: err.response?.data || err.message };
    }
  },

  // BUY DATA
  buyData: async ({ network, dataplan, phone }) => {
    const requestId = generateRequestID();
    const url =
      `${DATA_URL}?UserID=${USER_ID}` +
      `&APIKey=${API_KEY}` +
      `&MobileNetwork=${network}` +
      `&DataPlan=${dataplan}` +
      `&MobileNumber=${phone}` +
      `&RequestID=${requestId}`;

    try {
      const response = await axios.get(url);
      return { requestId, result: response.data };
    } catch (err) {
      return { requestId, error: err.response?.data || err.message };
    }
  },

  // VERIFY TRANSACTION
  verifyTransaction: async (requestId) => {
    const url = `https://www.nellobytesystems.com/APIQuery.asp?UserID=${USER_ID}&APIKey=${API_KEY}&RequestID=${requestId}`;

    try {
      const response = await axios.get(url);
      return response.data;
    } catch (err) {
      return { error: err.response?.data || err.message };
    }
  },
};

module.exports = clubKonnectService;