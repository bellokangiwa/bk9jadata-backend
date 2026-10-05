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
// ================== BUY AIRTIME WITH SMEPLUG ==================
exports.buyAirtime = async (req, res) => {
  try {
    // ==========================================================
    // AUTHENTICATION
    // ==========================================================
    const uid = req.auth?.uid;

    if (!uid) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    // ==========================================================
    // GET REQUEST DATA
    // ==========================================================
    const network = req.body.network?.toUpperCase();
    const amount = Number(req.body.amount);
    const phone = req.body.phone;

    // ==========================================================
    // VALIDATE REQUIRED FIELDS
    // ==========================================================
    if (!network || !amount || !phone) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    // ==========================================================
    // VALIDATE AMOUNT
    // Minimum airtime purchase = ₦50
    // ==========================================================
    if (amount < 50) {
      return res.status(400).json({
        error: "Minimum airtime purchase is ₦50",
      });
    }

    // ==========================================================
    // VALIDATE PHONE NUMBER
    // ==========================================================
    if (!/^0\d{10}$/.test(phone)) {
      return res.status(400).json({
        error: "Invalid phone number",
      });
    }

    // ==========================================================
    // SMEPLUG NETWORK MAPPING
    // ==========================================================
    const smePlugNetworkMap = {
      MTN: 1,
      AIRTEL: 2,
      "9MOBILE": 3,
      GLO: 4,
    };

    const providerNetwork =
      smePlugNetworkMap[network];

    if (!providerNetwork) {
      return res.status(400).json({
        error: "Invalid network",
      });
    }

    // ==========================================================
    // GENERATE REQUEST ID
    // ==========================================================
    const requestId = generateRequestID();

    // ==========================================================
    // CUSTOMER DISCOUNT
    //
    // User buys ₦100  -> pays ₦98
    // User buys ₦500  -> pays ₦498
    // User buys ₦1000 -> pays ₦998
    //
    // Same ₦2 discount for every network.
    // ==========================================================
    const discount = 2;

    const customerCharge = amount - discount;

    // ==========================================================
    // SAFETY CHECK
    // ==========================================================
    if (customerCharge <= 0) {
      return res.status(400).json({
        error: "Invalid airtime amount",
      });
    }

    const amountKobo =
      Math.round(customerCharge * 100);

    // ==========================================================
    // LOG PURCHASE INFORMATION
    // ==========================================================
    console.log(
      "=========================================="
    );

    console.log(
      "SMEPLUG AIRTIME PURCHASE"
    );

    console.log(
      "User ID:",
      uid
    );

    console.log(
      "Network:",
      network
    );

    console.log(
      "SMEPlug Network ID:",
      providerNetwork
    );

    console.log(
      "Phone:",
      phone
    );

    console.log(
      "Requested Airtime:",
      amount
    );

    console.log(
      "Customer Discount:",
      discount
    );

    console.log(
      "Customer Wallet Charge:",
      customerCharge
    );

    console.log(
      "Request ID:",
      requestId
    );

    console.log(
      "=========================================="
    );

    // ==========================================================
    // 1️⃣ DEBIT CUSTOMER WALLET
    //
    // Example:
    // Airtime = ₦100
    // Customer pays = ₦98
    // ==========================================================
    const debitResult = await debitWallet(
      uid,
      requestId,
      amountKobo,
      {
        purpose: "buy_airtime",
        network,
        amount,
        discount,
        customerCharge,
        provider: "SMEPLUG",
      }
    );

    if (!debitResult.success) {
      return res.status(400).json({
        error: "Insufficient wallet balance",
      });
    }

    // ==========================================================
    // 2️⃣ CALL SMEPLUG
    // ==========================================================
    let providerResponse;

    try {
      providerResponse =
        await smeplugService.buyAirtime({
          network_id: providerNetwork,
          phone,
          amount,
          request_id: requestId,
        });

    } catch (err) {
      console.error(
        "=========================================="
      );

      console.error(
        "SMEPLUG AIRTIME PROVIDER ERROR:"
      );

      console.error(
        err.response?.data ||
        err.message
      );

      console.error(
        "=========================================="
      );

      // ========================================================
      // REFUND CUSTOMER
      // ========================================================
      await creditWalletIdempotent(
        uid,
        "REFUND-" + requestId,
        amountKobo,
        {
          reason: "airtime_provider_failed",
          provider: "SMEPLUG",
        }
      );

      return res.status(500).json({
        error: "Provider request failed",
        detail:
          err.response?.data ||
          err.message,
      });
    }

    // ==========================================================
    // LOG PROVIDER RESPONSE
    // ==========================================================
    console.log(
      "=========================================="
    );

    console.log(
      "SMEPLUG AIRTIME RESULT:"
    );

    console.log(
      JSON.stringify(
        providerResponse,
        null,
        2
      )
    );

    console.log(
      "=========================================="
    );

    // ==========================================================
    // 3️⃣ CHECK SMEPLUG RESULT
    // ==========================================================
    if (
      !providerResponse ||
      providerResponse.status !== "success"
    ) {
      console.error(
        "SMEPLUG AIRTIME FAILED:"
      );

      console.error(
        JSON.stringify(
          providerResponse,
          null,
          2
        )
      );

      // ========================================================
      // REFUND CUSTOMER
      // ========================================================
      await creditWalletIdempotent(
        uid,
        "REFUND-" + requestId,
        amountKobo,
        {
          reason: "airtime_failed",
          provider: "SMEPLUG",
        }
      );

      return res.status(400).json({
        error: "Airtime purchase failed",
        detail: providerResponse,
      });
    }

    // ==========================================================
    // 4️⃣ GET SMEPLUG REFERENCE
    // ==========================================================
    const providerReference =
      providerResponse.reference ||
      requestId;

    // ==========================================================
    // 5️⃣ SAVE TRANSACTION
    // ==========================================================
    await Transaction.create({
      userId: uid,

      orderId: providerReference,

      phone,

      network,

      provider: "SMEPLUG",

      amount,

      requestId,

      status: "success",

      providerResponse:
        providerResponse.raw,
    });

    // ==========================================================
    // 6️⃣ SUCCESS RESPONSE
    // ==========================================================
    return res.status(200).json({
      success: true,

      message:
        providerResponse.message ||
        "Airtime purchase successful",

      requestId,

      orderId: providerReference,

      amount,

      customerCharge,

      discount,
    });

  } catch (err) {
    // ==========================================================
    // GLOBAL ERROR
    // ==========================================================
    console.error(
      "=========================================="
    );

    console.error(
      "BUY AIRTIME ERROR:"
    );

    console.error(err);

    console.error(
      "=========================================="
    );

    return res.status(500).json({
      status: false,
      error: "Internal server error",
    });
  }
};
// ================== BUY DATA ==================
exports.buyData = async (req, res) => {

  let uid;
  let requestId;
  let amountKobo = 0;
  let walletDebited = false;

  try {

    // ==================================================
    // 1. AUTHENTICATION
    // ==================================================

    uid = req.auth?.uid;

    if (!uid) {
      return res.status(401).json({
        status: false,
        error: "Unauthorized",
      });
    }

    // ==================================================
    // 2. INPUT
    // ==================================================

    const { planId, phone } = req.body;

    if (!planId || !phone) {
      return res.status(400).json({
        status: false,
        error: "planId and phone are required",
      });
    }

    // ==================================================
    // 3. GET DATA PLAN
    // ==================================================

    const plan = await DataPlan.findById(planId);

    if (!plan || plan.status !== "active") {
      return res.status(404).json({
        status: false,
        error: "Data plan not available",
      });
    }

    // ==================================================
    // 4. GENERATE ONE REQUEST ID
    // ==================================================

    requestId = generateRequestID();

    amountKobo = Math.round(
      Number(plan.sellingPrice) * 100
    );

    // ==================================================
    // 5. DEBIT USER WALLET
    // ==================================================

    const debitResult = await debitWallet(
      uid,
      requestId,
      amountKobo,
      {
        purpose: "buy_data",
        planId: plan._id.toString(),
      }
    );

    if (!debitResult.success) {

      return res.status(400).json({
        status: false,
        error: "Insufficient wallet balance",
      });
    }

    walletDebited = true;

    console.log(
      "DATA WALLET DEBIT SUCCESS:",
      {
        uid,
        requestId,
        amountKobo,
        provider: plan.provider,
      }
    );

    // ==================================================
    // 6. CALL PROVIDER
    // ==================================================

    let providerResponse;

    try {

      // ==================================================
      // CLUBKONNECT
      // ==================================================

      if (
        String(plan.provider).toUpperCase() ===
        "CLUBKONNECT"
      ) {

        const mappedNetwork =
          clubKonnectNetworkMap[
            String(plan.network).toUpperCase()
          ];

        if (!mappedNetwork) {

          await creditWalletIdempotent(
            uid,
            "REFUND-" + requestId,
            amountKobo,
            {
              reason: "invalid_network_mapping",
            }
          );

          return res.status(400).json({
            status: false,
            error: "Invalid network for ClubKonnect",
          });
        }

        providerResponse =
          await clubKonnectService.buyData({

            network: mappedNetwork,

            dataplan: plan.dataValue,

            phone,

            request_id: requestId,
          });
      }

      // ==================================================
      // SMEPLUG
      // ==================================================

      else if (
        String(plan.provider).toUpperCase() ===
        "SMEPLUG"
      ) {

        if (
          !plan.smeplugNetworkId ||
          !plan.smeplugPlanId
        ) {

          await creditWalletIdempotent(
            uid,
            "REFUND-" + requestId,
            amountKobo,
            {
              reason: "smeplug_config_error",
            }
          );

          return res.status(400).json({
            status: false,
            error:
              "SMEPlug plan not configured properly",
            note:
              "Missing networkId or planId",
          });
        }

        providerResponse =
          await smeplugService.buyData({

            network_id:
              plan.smeplugNetworkId,

            plan_id:
              plan.smeplugPlanId,

            phone,

            request_id: requestId,
          });
      }

      // ==================================================
      // UNKNOWN PROVIDER
      // ==================================================

      else {

        await creditWalletIdempotent(
          uid,
          "REFUND-" + requestId,
          amountKobo,
          {
            reason: "unsupported_provider",
          }
        );

        return res.status(400).json({
          status: false,
          error: "Unsupported provider",
        });
      }

    } catch (providerError) {

      console.error(
        "DATA PROVIDER EXCEPTION:",
        providerError
      );

      /*
       * Provider call threw an exception before
       * we received a usable response.
       *
       * Refund user.
       */
      await creditWalletIdempotent(
        uid,
        "REFUND-" + requestId,
        amountKobo,
        {
          reason: "provider_request_failed",
        }
      );

      return res.status(500).json({
        status: false,
        error: "Provider request failed",

        detail:
          providerError?.response?.data ||
          providerError?.message ||
          providerError,
      });
    }

    // ==================================================
    // 7. LOG NORMALIZED PROVIDER RESPONSE
    // ==================================================

    console.log(
      "NORMALIZED DATA PROVIDER RESPONSE:",
      JSON.stringify(
        providerResponse,
        null,
        2
      )
    );

    // ==================================================
    // 8. PROVIDER SUCCESS
    // ==================================================

    if (
      providerResponse &&
      providerResponse.status === "success"
    ) {

      // ==================================================
      // SAVE SUCCESS TRANSACTION
      // ==================================================

      await Transaction.create({

        userId: uid,

        phone,

        network: plan.network,

        provider: plan.provider,

        dataPlan: plan._id,

        amount: plan.sellingPrice,

        requestId,

        providerReference:
          providerResponse.reference ||
          requestId,

        status: "success",

        providerResponse:
          providerResponse.raw ||
          providerResponse,
      });

      // ==================================================
      // SUCCESS RESPONSE TO FLUTTER
      // ==================================================

      return res.status(200).json({

        status: true,

        message:
          providerResponse.message ||
          "Data purchase successful",

        requestId,

        transactionId: requestId,

        reference:
          providerResponse.reference ||
          requestId,
      });
    }

    // ==================================================
    // 9. PROVIDER PENDING
    // ==================================================

    if (
      providerResponse &&
      providerResponse.status === "pending"
    ) {

      /*
       * VERY IMPORTANT:
       *
       * Do NOT automatically refund here.
       *
       * The provider may have accepted the order
       * and may still be processing it.
       */

      await Transaction.create({

        userId: uid,

        phone,

        network: plan.network,

        provider: plan.provider,

        dataPlan: plan._id,

        amount: plan.sellingPrice,

        requestId,

        providerReference:
          providerResponse.reference ||
          requestId,

        status: "pending",

        providerResponse:
          providerResponse.raw ||
          providerResponse,
      });

      return res.status(200).json({

        status: true,

        pending: true,

        message:
          providerResponse.message ||
          "Data purchase is being processed",

        requestId,

        transactionId: requestId,

        reference:
          providerResponse.reference ||
          requestId,
      });
    }

    // ==================================================
    // 10. REAL PROVIDER FAILURE
    // ==================================================

    console.error(
      "DATA PROVIDER FAILED:",
      JSON.stringify(
        providerResponse,
        null,
        2
      )
    );

    await creditWalletIdempotent(
      uid,
      "REFUND-" + requestId,
      amountKobo,
      {
        reason: "data_purchase_failed",
        provider:
          plan.provider,
      }
    );

    return res.status(400).json({

      status: false,

      error:
        providerResponse?.error ||
        "Data purchase failed",

      detail:
        providerResponse?.raw ||
        providerResponse,
    });

  } catch (err) {

    console.error(
      "BUY DATA INTERNAL ERROR:",
      err
    );

    /*
     * Only refund if this transaction was actually
     * debited and we haven't already handled the refund.
     */
    if (walletDebited && uid && requestId) {

      try {

        await creditWalletIdempotent(
          uid,
          "REFUND-" + requestId,
          amountKobo,
          {
            reason:
              "buy_data_internal_error",
          }
        );

      } catch (refundError) {

        console.error(
          "REFUND ERROR:",
          refundError
        );
      }
    }

    return res.status(500).json({

      status: false,

      error:
        "Internal server error",
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
const allowedValues = [100, 200, 500, 1000];

if (!allowedValues.includes(parsedValue)) {
  return res.status(400).json({
    error: "Invalid recharge card value",
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

if (!providerResponse || !providerResponse.data) {
  throw new Error("Invalid provider response");
}

// ✅ Extract response safely
const data = providerResponse?.data || {};

console.log("FULL RESPONSE:", providerResponse);
console.log("RAW DATA:", data);

// ✅ Normalize pins from different possible formats
const pins = Array.isArray(data.TXN_EPIN)
  ? data.TXN_EPIN
  : Array.isArray(data.txn_epin)
  ? data.txn_epin
  : Array.isArray(data.epins)
  ? data.epins
  : [];

// ❌ If no pins → treat as failure and refund
if (pins.length === 0) {
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

// ✅ SAVE TRANSACTION (use normalized pins)
await Transaction.create({
  userId: uid,
  phone: "N/A", // ✅ FIX (since recharge card has no phone)
  network,
  amount: totalAmount,
  quantity: parsedQuantity,
  provider: "CLUBKONNECT",
  requestId,
  status: "success",
  pins: pins,
  providerResponse: data,
});
// ✅ SUCCESS RESPONSE
return res.status(200).json({
  success: true,
  message: "Recharge card generated successfully",
  requestId,
  pins: pins, // ✅ FIXED
});


  } catch (err) {
  console.error("Recharge card error FULL:", err);

  // 🔁 REFUND USER (VERY IMPORTANT)
  await creditWalletIdempotent(
    uid,
    "REFUND-" + requestId,
    amountKobo,
    { reason: "transaction_save_failed" }
  );

  return res.status(500).json({
    status: false,
    error: err.message,
  });
}};
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