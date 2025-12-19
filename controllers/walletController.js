const axios = require("axios");
const admin = require("firebase-admin");

const db = admin.firestore();

// ===== Environment =====
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = process.env.PAYSTACK_BASE || "https://api.paystack.co";
const paystackPrefix = process.env.PAYSTACK_PREFIX || "BK9JA-WALLET-";

// ===== Collections =====
const walletsCol = () => db.collection("wallets");
const txCol = () => db.collection("wallet_transactions");

// ===== Helpers =====
function nairaToKobo(naira) {
  return Math.round(Number(naira) * 100);
}
function koboToNaira(kobo) {
  return Number(kobo) / 100;
}
async function recordWalletTx(txId, payload) {
  return txCol().doc(txId).set(
    {
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...payload,
    },
    { merge: true }
  );
}

// ===== Idempotent Credit (FIXED) =====
async function creditWalletIdempotent(userId, txId, amount_kobo, meta = {}) {
  const txRef = txCol().doc(txId);

  await db.runTransaction(async (t) => {
    const txSnap = await t.get(txRef);
    if (txSnap.exists && txSnap.data().processed === true) {
      return;
    }

    const walletRef = walletsCol().doc(userId);
    const walletSnap = await t.get(walletRef);
    const prev = walletSnap.exists ? walletSnap.data().balance || 0 : 0;

    if (!walletSnap.exists) {
      t.set(walletRef, { balance: prev + amount_kobo });
    } else {
      t.update(walletRef, { balance: prev + amount_kobo });
    }

    t.set(
      txRef,
      {
        processed: true,
        userId,
        amount_kobo,
        type: "credit",
        meta,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  return { processed: true };
}

// ===== Safe Debit (FIXED) =====
async function debitWallet(userId, txId, amount_kobo, meta = {}) {
  const txRef = txCol().doc(txId);

  return await db.runTransaction(async (t) => {
    const txSnap = await t.get(txRef);
    if (txSnap.exists && txSnap.data().processed === true) {
      return { success: false, reason: "already_processed" };
    }

    const walletRef = walletsCol().doc(userId);
    const walletSnap = await t.get(walletRef);
    const current = walletSnap.exists ? walletSnap.data().balance || 0 : 0;

    if (current < amount_kobo) {
      return { success: false, reason: "insufficient_funds", current };
    }

    t.update(walletRef, { balance: current - amount_kobo });

    t.set(
      txRef,
      {
        processed: true,
        userId,
        amount_kobo,
        type: "debit",
        meta,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { success: true, remaining: current - amount_kobo };
  });
}

// ================= CONTROLLERS =================

// GET /wallet/balance/:userId
exports.getBalance = async (req, res) => {
  try {
    const snap = await walletsCol().doc(req.params.userId).get();
    if (!snap.exists) {
      return res.status(404).json({ status: false, message: "Wallet not found" });
    }

    const balance = snap.data().balance || 0;
    return res.json({
      status: true,
      balance,
      balance_naira: koboToNaira(balance),
    });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
};

// POST /wallet/fund
exports.initiateFund = async (req, res) => {
  try {
    const uid = req.auth?.uid;
    if (!uid) return res.status(401).json({ error: "Not authenticated" });

    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: "amount required" });

    const amount_kobo = nairaToKobo(amount);
    const reference = `${paystackPrefix}${Date.now()}`;

    const init = await axios.post(
      `${PAYSTACK_BASE}/transaction/initialize`,
      {
        email: `${uid}@bk9ja.internal`,
        amount: amount_kobo,
        reference,
        metadata: { userId: uid, purpose: "wallet_fund" },
      },
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      }
    );

    await recordWalletTx(reference, {
      userId: uid,
      amount_kobo,
      type: "fund_init",
      processed: false,
    });

    return res.json({ status: true, data: init.data });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
};

// GET /wallet/verify/:reference
exports.verifyFund = async (req, res) => {
  try {
    const reference = req.params.reference;

    // 🔒 Prevent double verification
    const txSnap = await txCol().doc(reference).get();
    if (txSnap.exists && txSnap.data().processed === true) {
      return res.json({
        verified: true,
        status: true,
        message: "Already verified",
      });
    }

    const resp = await axios.get(
      `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );

    await recordWalletTx(reference, { paystack_verify: resp.data });

    if (resp.data?.data?.status !== "success") {
      return res.json({ verified: false, status: false });
    }

    const amountKobo = resp.data.data.amount;
    const amountNaira = koboToNaira(amountKobo);

    const userId = resp.data.data.metadata?.userId;
    if (!userId) {
      return res.status(400).json({ status: false, error: "User not found in metadata" });
    }

    // ===== FEES (SAFE ROUNDING) =====
    const paystackFee = Math.round(amountNaira * 0.015 * 100) / 100;
    const myFee = Math.round(amountNaira * 0.02 * 100) / 100;
    const totalFee = paystackFee + myFee;

    const finalCreditNaira = amountNaira - totalFee;
    const finalCreditKobo = nairaToKobo(finalCreditNaira);

    const meta = {
      paystack: resp.data.data,
      paystackFee,
      myFee,
      totalFee,
      originalAmount: amountNaira,
      creditedAmount: finalCreditNaira,
      source: "verify_endpoint",
    };

    await creditWalletIdempotent(userId, reference, finalCreditKobo, meta);

    return res.json({
      verified: true,
      status: true,
      message: "Wallet funded successfully",
      final_wallet_credit: finalCreditNaira,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      error: err.response?.data || err.message,
    });
  }
};

// GET /wallet/history/:userId
exports.history = async (req, res) => {
  try {
    const snap = await txCol()
      .where("userId", "==", req.params.userId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ status: true, items });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
};

// POST /wallet/debit (protected)
exports.debit = async (req, res) => {
  try {
    const uid = req.auth?.uid;
    if (!uid) {
      return res.status(401).json({ status: false, error: "Not authenticated" });
    }

    const { amount, reason } = req.body;
    if (!amount) {
      return res.status(400).json({ status: false, error: "amount required" });
    }

    const amount_kobo = nairaToKobo(amount);
    const txId = `DEBIT-${uid}-${Date.now()}`;

    const result = await debitWallet(uid, txId, amount_kobo, { reason });

    if (!result.success) {
      return res.status(400).json({
        status: false,
        reason: result.reason,
        current_balance_kobo: result.current || 0,
        current_balance_naira: koboToNaira(result.current || 0),
      });
    }

    return res.json({
      status: true,
      message: "Wallet debited successfully",
      remaining_kobo: result.remaining,
      remaining_naira: koboToNaira(result.remaining),
    });

  } catch (err) {
    console.error("debit error:", err.message);
    return res.status(500).json({ status: false, error: err.message });
  }
};
