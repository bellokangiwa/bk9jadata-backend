const axios = require("axios");
const DataPlan = require("../models/DataPlan");
const Transaction = require("../models/Transaction");
const { debitWallet, creditWalletIdempotent } = require("./walletController");

const smeplugService = require("../services/smeplugService");
const clubKonnectService = require("../services/clubKonnectService");

// ================= HELPERS =================
function generateRequestID() {
  return "BK9JA_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
}

// ================== GET AIRTIME SERVICES ==================
exports.getAirtimeServices = async (req, res) => {
  try {
    // Example: you can fetch airtime services from ClubKonnect
    const response = await axios.get(`${process.env.CLUBKONNECT_DISCOUNT_URL}?UserID=${process.env.CLUBKONNECT_USER_ID}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
};

// ================== BUY AIRTIME ==================
exports.buyAirtime = async (req, res) => {
  try {
    const uid = req.auth?.uid;
    if (!uid) return res.status(401).json({ error: "Not authenticated" });

    const { network, amount, phone } = req.body;
    if (!network || !amount || !phone) return res.status(400).json({ error: "Missing required fields" });

    const requestId = generateRequestID();
    const amountKobo = Math.round(amount * 100);

    // Debit wallet
    const debitResult = await debitWallet(uid, requestId, amountKobo, { purpose: "buy_airtime" });
    if (!debitResult.success) return res.status(400).json({ error: "Insufficient wallet balance" });

    // Call ClubKonnect Airtime API
    const providerResponse = await axios.get(
      `${process.env.CLUBKONNECT_AIRTIME_URL}?UserID=${process.env.CLUBKONNECT_USER_ID}` +
      `&APIKey=${process.env.CLUBKONNECT_API_KEY}` +
      `&MobileNetwork=${network}` +
      `&Amount=${amount}` +
      `&MobileNumber=${phone}` +
      `&RequestID=${requestId}`
    );

    // Save transaction in DB
    await Transaction.create({
      userId: uid,
      phone,
      network,
      provider: "CLUBKONNECT",
      amount,
      requestId,
      status: providerResponse.data?.status === "success" ? "success" : "failed",
      providerResponse: providerResponse.data,
    });

    // If failed, refund wallet
    if (providerResponse.data?.status !== "success") {
      await creditWalletIdempotent(uid, "REFUND-" + Date.now(), amountKobo, { reason: "airtime_failed" });
      throw new Error("Airtime purchase failed");
    }

    res.json({ status: true, message: "Airtime purchase successful", requestId });
  } catch (err) {
    console.error("Buy airtime failed:", err.message);
    res.status(500).json({ status: false, error: err.message || "Transaction failed" });
  }
};

// ================== BUY DATA ==================
exports.buyData = async (req, res) => {
  try {
    const uid = req.auth?.uid;
    if (!uid) return res.status(401).json({ error: "Not authenticated" });

    const { planId, phone } = req.body;
    if (!planId || !phone) return res.status(400).json({ error: "planId and phone are required" });

    const plan = await DataPlan.findById(planId);
    if (!plan || plan.status !== "active") return res.status(404).json({ error: "Data plan not available" });

    const requestId = generateRequestID();
    const amountKobo = Math.round(plan.sellingPrice * 100);

    const debitResult = await debitWallet(uid, requestId, amountKobo, { purpose: "buy_data", planId });
    if (!debitResult.success) return res.status(400).json({ error: "Insufficient wallet balance" });

    const tx = await Transaction.create({
      userId: uid,
      phone,
      network: plan.network,
      provider: plan.provider,
      dataPlan: plan._id,
      amount: plan.sellingPrice,
      requestId,
      status: "pending",
    });

    let providerResponse;
    if (plan.provider === "CLUBKONNECT") {
      providerResponse = await clubKonnectService.buyData({ network: plan.network, dataplan: plan.dataValue, phone });
      if (providerResponse.error || providerResponse.result?.status !== "success") throw new Error("ClubKonnect failed");
    } else if (plan.provider === "SMEPLUG") {
      providerResponse = await smeplugService.buyData({ network: plan.network, plan_code: plan.apiCode, phone, request_id: requestId });
      if (providerResponse.error || providerResponse.result?.status !== "success") throw new Error("SMEPlug failed");
    }

    tx.status = "success";
    tx.providerResponse = providerResponse;
    await tx.save();

    res.json({ status: true, message: "Data purchase successful", requestId });
  } catch (err) {
    console.error("Buy data failed:", err.message);

    if (req.auth?.uid) {
      await creditWalletIdempotent(req.auth.uid, "REFUND-" + Date.now(), req.body?.amount ? Math.round(req.body.amount * 100) : 0, { reason: "data_purchase_failed" });
    }

    res.status(500).json({ status: false, error: err.message || "Transaction failed" });
  }
};

// ================== VERIFY TRANSACTION ==================
exports.verifyTransaction = async (req, res) => {
  try {
    const { request_id } = req.params;
    const url = `https://www.nellobytesystems.com/APIQuery.asp?UserID=${process.env.CLUBKONNECT_USER_ID}&APIKey=${process.env.CLUBKONNECT_API_KEY}&RequestID=${request_id}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ status: false, error: err.response?.data || err.message });
  }
};