const axios = require("axios");
const DataPlan = require("../models/DataPlan");
const Transaction = require("../models/Transaction");
const { debitWallet, creditWalletIdempotent } = require("./walletController");
const { clubKonnectNetworkMap } = require("../utils/networkMapper");
const { rechargeCardNetworkMap } = require("../utils/networkMapper");
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
function calculateDiscount(network, amount) {
  const discounts = {
    MTN: 2,
    AIRTEL: 2,
    GLO: 6,
    "9MOBILE": 5,
  };

  return amount - (discounts[network] || 0);
}

// ================== BUY AIRTIME ==================
exports.buyAirtime = async (req, res) => {
  try {
    const uid = req.auth?.uid;
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const network = req.body.network?.toUpperCase();
    const amount = req.body.amount;
    const phone = req.body.phone;
    if (!network || !amount || !phone) {
  return res.status(400).json({ error: "Missing required fields" });
}

if (amount < 50) {
  return res.status(400).json({
    error: "Minimum airtime purchase is ₦50",
  });
}

    // Convert network
    const providerNetwork = clubKonnectNetworkMap[network];
    if (!providerNetwork) {
      return res.status(400).json({ error: "Invalid network" });
    }

    const requestId = generateRequestID();
    const finalAmount = calculateDiscount(network, amount);
    const amountKobo = Math.round(finalAmount * 100);

    // 1️⃣ DEBIT WALLET FIRST
    const debitResult = await debitWallet(
      uid,
      requestId,
      amountKobo,
      { purpose: "buy_airtime" }
    );

    if (!debitResult.success) {
      return res.status(400).json({ error: "Insufficient wallet balance" });
    }

    // 2️⃣ CALL PROVIDER
    let providerResponse;
    try {
      providerResponse = await axios.get(
        process.env.CLUBKONNECT_AIRTIME_URL,
        {
          params: {
            UserID: process.env.CLUBKONNECT_USER_ID,
            APIKey: process.env.CLUBKONNECT_API_KEY,
            MobileNetwork: providerNetwork,
            Amount: amount,
            MobileNumber: phone,
            RequestID: requestId,
          },
        }
      );
    } catch (err) {
      // 🔁 REFUND ON PROVIDER FAILURE
      await creditWalletIdempotent(
        uid,
        "REFUND-" + requestId,
        amountKobo,
        { reason: "airtime_provider_failed" }
      );

      return res.status(500).json({
        error: "Provider request failed",
        detail: err.response?.data || err.message,
      });
    }

    const clubResponse = providerResponse.data;

    // 3️⃣ CHECK PROVIDER STATUS
    if (clubResponse.statuscode !== "100") {
      await creditWalletIdempotent(
        uid,
        "REFUND-" + requestId,
        amountKobo,
        { reason: "airtime_failed" }
      );

      return res.status(400).json({
        error: "Airtime purchase failed",
        detail: clubResponse,
      });
    }

    // 4️⃣ SAVE TRANSACTION
    await Transaction.create({
      userId: uid,
      orderId: clubResponse.orderid,
      phone,
      network,
      provider: "CLUBKONNECT",
      amount,
      requestId,
      status: "success",
      providerResponse: clubResponse,
    });

    // 5️⃣ SUCCESS RESPONSE
    return res.status(200).json({
      success: true,
      message: "Airtime purchase successful",
      requestId,
      orderId: clubResponse.orderid,
    });

  } catch (err) {
    console.error("Buy airtime error:", err);
    return res.status(500).json({
      status: false,
      error: "Internal server error",
    });
  }
};
// ================== BUY DATA ==================
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

    // ================= 1️⃣ DEBIT WALLET FIRST =================
    const debitResult = await debitWallet(
      uid,
      requestId,
      amountKobo,
      { purpose: "buy_data", planId }
    );

    if (!debitResult.success) {
      return res.status(400).json({
        error: "Insufficient wallet balance",
      });
    }

    // ================= 2️⃣ CALL PROVIDER =================
    let providerResponse;

    try {
      if (plan.provider === "CLUBKONNECT") {

        const mappedNetwork = clubKonnectNetworkMap[plan.network];
        if (!mappedNetwork) {
          // Refund before returning
          await creditWalletIdempotent(
            uid,
            "REFUND-" + requestId,
            amountKobo,
            { reason: "invalid_network_mapping" }
          );

          return res.status(400).json({
            error: "Invalid network for ClubKonnect",
          });
        }

        providerResponse = await clubKonnectService.buyData({
          network: mappedNetwork,
          dataplan: plan.dataValue,
          phone,
          request_id: requestId,
        });

      } else if (plan.provider === "SMEPLUG") {

        if (!plan.smeplugNetworkId || !plan.smeplugPlanId) {

          await creditWalletIdempotent(
            uid,
            "REFUND-" + requestId,
            amountKobo,
            { reason: "smeplug_config_error" }
          );

          return res.status(400).json({
            error: "SMEplug plan not configured properly",
            note: "Missing networkId or planId",
          });
        }

        providerResponse = await smeplugService.buyData({
          network_id: plan.smeplugNetworkId,
          plan_id: plan.smeplugPlanId,
          phone,
        });

      } else {

        await creditWalletIdempotent(
          uid,
          "REFUND-" + requestId,
          amountKobo,
          { reason: "unsupported_provider" }
        );

        return res.status(400).json({
          error: "Unsupported provider",
        });
      }

    } catch (err) {

      // 🔁 Refund if provider call fails
      await creditWalletIdempotent(
        uid,
        "REFUND-" + requestId,
        amountKobo,
        { reason: "provider_request_failed" }
      );

      return res.status(500).json({
        error: "Provider request failed",
        detail: err.response?.data || err.message,
      });
    }

    // ================= 3️⃣ CHECK PROVIDER STATUS =================
    if (providerResponse.status !== "success") {

      await creditWalletIdempotent(
        uid,
        "REFUND-" + requestId,
        amountKobo,
        { reason: "data_purchase_failed" }
      );

      return res.status(400).json({
        error: "Data purchase failed",
        detail: providerResponse,
      });
    }

    // ================= 4️⃣ SAVE TRANSACTION =================
    await Transaction.create({
      userId: uid,
      phone,
      network: plan.network,
      provider: plan.provider,
      dataPlan: plan._id,
      amount: plan.sellingPrice,
      requestId,
      providerReference: providerResponse.reference,
      status: "success",
      providerResponse,
    });

    // ================= 5️⃣ SUCCESS RESPONSE =================
    return res.json({
      status: true,
      message: "Data purchase successful",
      requestId,
    });

  } catch (err) {
    console.error("Buy data failed:", err);
    return res.status(500).json({
      status: false,
      error: "Internal server error",
    });
  }
};
// ================== BUY RECHARGE CARD (E-PIN) ==================
exports.buyRechargeCard = async (req, res) => {
  try {
    const uid = req.auth?.uid;
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { network, value, quantity } = req.body;

    // ✅ Validate input
    if (!network || value == null || quantity == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const parsedValue = Number(value);
    const parsedQuantity = Number(quantity);

    if (isNaN(parsedValue) || isNaN(parsedQuantity)) {
      return res.status(400).json({
        error: "Invalid value or quantity",
      });
    }

    if (parsedQuantity < 1 || parsedQuantity > 20) {
      return res.status(400).json({
        error: "Quantity must be between 1 and 20",
      });
    }

    const requestId = generateRequestID();
    const totalAmount = parsedValue * parsedQuantity;
    const amountKobo = Math.round(totalAmount * 100);

    // 1️⃣ DEBIT WALLET
    const debitResult = await debitWallet(
      uid,
      requestId,
      amountKobo,
      { purpose: "buy_recharge_card", network, value: parsedValue, quantity: parsedQuantity }
    );

    if (!debitResult.success) {
      return res.status(400).json({
        error: "Insufficient wallet balance",
      });
    }

    // 2️⃣ MAP NETWORK (VERY IMPORTANT FIX)
    const mappedNetwork = rechargeCardNetworkMap[network.toUpperCase()];

    if (!mappedNetwork) {
      await creditWalletIdempotent(
        uid,
        "REFUND-" + requestId,
        amountKobo,
        { reason: "invalid_network_mapping" }
      );

      return res.status(400).json({
        error: "Invalid network for recharge card",
      });
    }

    // 3️⃣ CALL PROVIDER (FIXED STRUCTURE)
    let providerResponse;

    try {
      providerResponse = await axios.get(
        "https://www.nellobytesystems.com/APIEPINV1.asp",
        {
          params: {
            UserID: process.env.CLUBKONNECT_USER_ID, 
            APIKey: process.env.CLUBKONNECT_API_KEY, 
            MobileNetwork: mappedNetwork, 
            Value: parsedValue,
            Quantity: parsedQuantity,
            RequestID: requestId,
          },
        }
      );
    } catch (err) {
      // 🔁 REFUND IF API FAILS
      await creditWalletIdempotent(
        uid,
        "REFUND-" + requestId,
        amountKobo,
        { reason: "recharge_provider_failed" }
      );

      return res.status(500).json({
        error: "Recharge provider failed",
        detail: err.response?.data || err.message,
      });
    }

const data = providerResponse.data;

console.log("EPIN RESPONSE:", data);
if (!data.TXN_EPIN || data.TXN_EPIN.length === 0) {
  await creditWalletIdempotent(
    uid,
    "REFUND-" + requestId,
    amountKobo,
    { reason: "recharge_failed" }
  );

  return res.status(400).json({
    error: "Recharge card generation failed",
    detail: data,
  });
}

    // 5️⃣ SAVE TRANSACTION
    await Transaction.create({
      userId: uid,
      network,
      amount: totalAmount,
      quantity: parsedQuantity,
      provider: "CLUBKONNECT", 
      requestId,
      status: "success",
      pins: data.TXN_EPIN,
      providerResponse: data,
    });

    // 6️⃣ RESPONSE
    return res.status(200).json({
      success: true,
      message: "Recharge card generated successfully",
      requestId,
      pins: data.TXN_EPIN,
    });

  } catch (err) {
    console.error("Recharge card error:", err);
    return res.status(500).json({
      status: false,
      error: "Internal server error",
    });
  }
};
exports.verifyTransaction = async (req, res) => {
  try {
    const uid = req.auth?.uid;
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { request_id } = req.params;

    const transaction = await Transaction.findOne({
      userId: uid,
      requestId: request_id,
    });

    if (!transaction) {
      return res.status(404).json({
        error: "Transaction not found",
      });
    }

    return res.json({
      status: true,
      transaction,
    });

  } catch (err) {
    console.error("Verify transaction error:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}; 