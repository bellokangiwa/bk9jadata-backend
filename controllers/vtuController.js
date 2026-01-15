const axios = require("axios");
const DataPlan = require("../models/DataPlan");
const Transaction = require("../models/Transaction");
const { debitWallet, creditWalletIdempotent } = require("./walletController");
const { clubKonnectNetworkMap } = require("../utils/networkMapper");
const smeplugService = require("../services/smeplugService");
const clubKonnectService = require("../services/clubkonnectService");

// ================= HELPERS =================
// Generates a unique request ID for each transaction
function generateRequestID() {
  return "BK9JA_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
}

// ================== GET AIRTIME SERVICES ==================
exports.getAirtimeServices = async (req, res) => {
  try {
    // Fetch airtime services from ClubKonnect API
    const response = await axios.get(
      `${process.env.CLUBKONNECT_DISCOUNT_URL}?UserID=${process.env.CLUBKONNECT_USER_ID}`
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
};

// ================== BUY AIRTIME ==================
exports.buyAirtime = async (req, res) => {
  try {
    const uid = req.auth?.uid;
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { network, amount, phone } = req.body;
    if (!network || !amount || !phone) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ Convert network to ClubKonnect code
    const providerNetwork = clubKonnectNetworkMap[network];
    if (!providerNetwork) {
      return res.status(400).json({
        error: "Invalid network",
        allowed: ["MTN", "GLO", "AIRTEL", "9MOBILE"],
      });
    }

    const requestId = generateRequestID();
    const amountKobo = Math.round(amount * 100);

    // ================= CALL PROVIDER FIRST =================
    let providerResponse;
    try {
      providerResponse = await axios.get(
        process.env.CLUBKONNECT_AIRTIME_URL,
        {
          params: {
            UserID: process.env.CLUBKONNECT_USER_ID,
            APIKey: process.env.CLUBKONNECT_API_KEY,
            MobileNetwork: providerNetwork, // ✅ FIXED
            Amount: amount,
            MobileNumber: phone,
            RequestID: requestId,
          },
        }
      );
    } catch (err) {
      return res.status(500).json({
        error: "Provider request failed",
        detail: err.response?.data || err.message,
      });
    }

    // ❌ Provider responded but failed
    const clubResponse = response.data;

// ✅ SUCCESS FROM CLUBKONNECT
if (clubResponse.statuscode === "100") {

  await Transaction.create({
    orderId: clubResponse.orderid,
    network: clubResponse.mobilenetwork,
    phone: clubResponse.mobilenumber,
    amount: clubResponse.amount,
    provider: "CLUBKONNECT",
    status: "SUCCESS"
  });

  return res.status(200).json({
    success: true,
    message: "Airtime purchase successful",
    data: clubResponse
  });
}

// ❌ FAILURE FROM CLUBKONNECT
return res.status(400).json({
  error: "Airtime purchase failed",
  detail: clubResponse
});

    // ================= DEBIT WALLET AFTER SUCCESS =================
    const debitResult = await debitWallet(
      uid,
      requestId,
      amountKobo,
      { purpose: "buy_airtime" }
    );

    if (!debitResult.success) {
      // ⚠️ Very rare: provider success but wallet failed
      return res.status(400).json({
        error: "Insufficient wallet balance",
        note: "Provider succeeded, wallet not debited",
      });
    }

    // ================= SAVE TRANSACTION =================
    await Transaction.create({
      userId: uid,
      phone,
      network,
      provider: "CLUBKONNECT",
      amount,
      requestId,
      status: "success",
      providerResponse: providerResponse.data,
    });

    return res.json({
      status: true,
      message: "Airtime purchase successful",
      requestId,
    });

  } catch (err) {
    console.error("Buy airtime error:", err);
    return res.status(500).json({
      status: false,
      error: "Internal server error",
    });
  }
};// ================== BUY DATA ==================
exports.buyData = async (req, res) => {
  try {
    const uid = req.auth?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const { planId, phone } = req.body;
    if (!planId || !phone) {
      return res.status(400).json({ error: "planId and phone are required" });
    }

    const plan = await DataPlan.findById(planId);
    if (!plan || plan.status !== "active") {
      return res.status(404).json({ error: "Data plan not available" });
    }

    const requestId = generateRequestID();
    const amountKobo = Math.round(plan.sellingPrice * 100);

    // ================= PROVIDER CALL FIRST =================
    let providerResponse;

    try {
      if (plan.provider === "CLUBKONNECT") {
        const mappedNetwork = clubKonnectNetworkMap[plan.network];
        if (!mappedNetwork) {
          return res.status(400).json({ error: "Invalid network for ClubKonnect" });
        }

        providerResponse = await clubKonnectService.buyData({
          network: mappedNetwork,
          dataplan: plan.dataValue,
          phone,
          request_id: requestId,
        });
      } else {
        providerResponse = await smeplugService.buyData({
          network: plan.network,
          plan_code: plan.apiCode,
          phone,
          request_id: requestId,
        });
      }
    } catch (err) {
      return res.status(500).json({
        error: "Provider request failed",
        detail: err.response?.data || err.message,
      });
    }

    if (providerResponse?.status !== "success") {
      return res.status(400).json({
        error: "Data purchase failed",
        detail: providerResponse,
      });
    }

    // ================= DEBIT WALLET AFTER SUCCESS =================
    const debitResult = await debitWallet(
      uid,
      requestId,
      amountKobo,
      { purpose: "buy_data", planId }
    );

    if (!debitResult.success) {
      return res.status(400).json({
        error: "Insufficient wallet balance",
        note: "Provider succeeded but wallet not debited",
      });
    }

    // ================= SAVE TRANSACTION =================
    await Transaction.create({
      userId: uid,
      phone,
      network: plan.network,
      provider: plan.provider,
      dataPlan: plan._id,
      amount: plan.sellingPrice,
      requestId,
      status: "success",
      providerResponse,
    });

    res.json({
      status: true,
      message: "Data purchase successful",
      requestId,
    });

  } catch (err) {
    console.error("Buy data failed:", err);
    res.status(500).json({
      status: false,
      error: "Internal server error",
    });
  }
};
// ================== VERIFY TRANSACTION ==================
exports.verifyTransaction = async (req, res) => {
  try {
    const { request_id } = req.params;

    const response = await axios.get(
      "https://www.nellobytesystems.com/APIQuery.asp",
      {
        params: {
          UserID: process.env.CLUBKONNECT_USER_ID,
          APIKey: process.env.CLUBKONNECT_API_KEY,
          RequestID: request_id,
        },
      }
    );

    return res.json(response.data);
  } catch (err) {
    return res.status(500).json({
      status: false,
      error: err.response?.data || err.message,
    });
  }
};