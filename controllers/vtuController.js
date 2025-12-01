const axios = require("../node_modules/axios/index.d.cts");

// ENV VARIABLES
const USER_ID = process.env.CLUBKONNECT_USER_ID;
const API_KEY = process.env.CLUBKONNECT_API_KEY;
const AIRTIME_URL = process.env.CLUBKONNECT_AIRTIME_URL;
const DATA_URL = process.env.CLUBKONNECT_DATA_URL;
const DISCOUNT_URL = process.env.CLUBKONNECT_DISCOUNT_URL;

// GENERATE UNIQUE REQUEST ID
function generateRequestID() {
  return "BK9JA_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
}

// GET AIRTIME SERVICES (OPTIONAL)
exports.getAirtimeServices = async (req, res) => {
  try {
    const url = `${DISCOUNT_URL}?UserID=${USER_ID}`;

    const response = await axios.get(url);

    res.json(response.data);
  } catch (err) {
    res.status(500).json({
      error: err.response?.data || err.message,
    });
  }
};

// BUY AIRTIME
exports.buyAirtime = async (req, res) => {
  const { network, amount, phone } = req.body;

  if (!network || !amount || !phone) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const request_id = generateRequestID();

  const url =
    `${AIRTIME_URL}?UserID=${USER_ID}` +
    `&APIKey=${API_KEY}` +
    `&MobileNetwork=${network}` +     // 01 MTN, 02 GLO, 04 Airtel, 03 9mobile
    `&Amount=${amount}` +
    `&MobileNumber=${phone}` +
    `&RequestID=${request_id}`;

  try {
    const response = await axios.get(url);

    res.json({
      request_id,
      result: response.data,
    });
  } catch (err) {
    res.status(500).json({
      error: err.response?.data || err.message,
    });
  }
};

// BUY DATA
exports.buyData = async (req, res) => {
  const { network, dataplan, phone } = req.body;

  if (!network || !dataplan || !phone) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const request_id = generateRequestID();

  const url =
    `${DATA_URL}?UserID=${USER_ID}` +
    `&APIKey=${API_KEY}` +
    `&MobileNetwork=${network}` +  // network code
    `&DataPlan=${dataplan}` +      // exact plan code e.g. "500", "1GB", etc.
    `&MobileNumber=${phone}` +
    `&RequestID=${request_id}`;

  try {
    const response = await axios.get(url);

    res.json({
      request_id,
      result: response.data,
    });
  } catch (err) {
    res.status(500).json({
      error: err.response?.data || err.message,
    });
  }
};

// VERIFY (TRANSACTION STATUS)
exports.verifyTransaction = async (req, res) => {
  const { request_id } = req.params;

  const url = `https://www.nellobytesystems.com/APIQuery.asp?UserID=${USER_ID}&APIKey=${API_KEY}&RequestID=${request_id}`;

  try {
    const response = await axios.get(url);

    res.json(response.data);
  } catch (err) {
    res.status(500).json({
      error: err.response?.data || err.message,
    });
  }
};
