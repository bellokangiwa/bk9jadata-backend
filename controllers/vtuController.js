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

// ================== BUY DATA ==================
exports.buyData = async (req, res) => {
  try {
    const uid = req.auth?.uid;
    if (!uid) return res.status(401).json({ error: "Not authenticated" });

    const { planId, phone } = req.body;
    if (!planId || !phone)
      return res.status(400).json({ error: "planId and phone are required" });

    // 1️⃣ Fetch Data Plan
    const plan = await DataPlan.findById(planId);
    if (!plan || plan.status !== "active")
      return res.status(404).json({ error: "Data plan not available" });

    const requestId = generateRequestID();
    const amountKobo = Math.round(plan.sellingPrice * 100);

    // 2️⃣ Debit Wallet
    const debitResult = await debitWallet(uid, requestId, amountKobo, {
      purpose: "buy_data",
      planId,
    });
    if (!debitResult.success)
      return res.status(400).json({ error: "Insufficient wallet balance" });

    // 3️⃣ Save Transaction (pending)
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

    // 4️⃣ Call Provider
    if (plan.provider === "CLUBKONNECT") {
      providerResponse = await clubKonnectService.buyData({
        network: plan.network,
        dataplan: plan.dataValue,
        phone,
      });
      if (providerResponse.error || providerResponse.result?.status !== "success")
        throw new Error("ClubKonnect failed");
    } else if (plan.provider === "SMEPLUG") {
      providerResponse = await smeplugService.buyData({
        network: plan.network,
        plan_code: plan.apiCode,
        phone,
        request_id: requestId,
      });
      if (providerResponse.error || providerResponse.result?.status !== "success")
        throw new Error("SMEPlug failed");
    }

    // 5️⃣ Update Transaction as success
    tx.status = "success";
    tx.providerResponse = providerResponse;
    await tx.save();

    return res.json({
      status: true,
      message: "Data purchase successful",
      requestId,
    });
  } catch (err) {
    console.error("Buy data failed:", err.message);

    // 🔁 Refund wallet on failure
    if (req.auth?.uid) {
      await creditWalletIdempotent(
        req.auth.uid,
        "REFUND-" + Date.now(),
        req.body?.amount ? Math.round(req.body.amount * 100) : 0,
        { reason: "data_purchase_failed" }
      );
    }

    return res.status(500).json({
      status: false,
      error: err.message || "Transaction failed",
    });
  }
};