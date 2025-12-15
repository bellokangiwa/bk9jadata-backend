const axios = require("axios");
const admin = require("firebase-admin");
const crypto = require("crypto");

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

// ===== Idempotent Credit =====
async function creditWalletIdempotent(userId, txId, amount_kobo, meta = {}) {
  const txRef = txCol().doc(txId);
  const txSnap = await txRef.get();

  if (txSnap.exists && txSnap.data().processed === true) {
    return { processed: false, reason: "already_processed" };
  }

  await db.runTransaction(async (t) => {
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
      },
      { merge: true }
    );
  });

  return { processed: true };
}

// ===== Safe Debit =====
async function debitWallet(userId, txId, amount_kobo, meta = {}) {
  const txRef = txCol().doc(txId);
  const txSnap = await txRef.get();

  if (txSnap.exists && txSnap.data().processed === true) {
    return { success: false, reason: "already_processed" };
  }

  const result = await db.runTransaction(async (t) => {
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
      },
      { merge: true }
    );

    return { success: true, remaining: current - amount_kobo };
  });

  return result;
}

// ===== Controllers =====

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

    const resp = await axios.get(
      `${PAYSTACK_BASE}/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );

    if (resp.data?.data?.status !== "success") {
      return res.json({ status: false, verified: false });
    }

    const amount_kobo = resp.data.data.amount;
    const userId = resp.data.data.metadata?.userId;

    const credit = await creditWalletIdempotent(
      userId,
      reference,
      amount_kobo,
      { paystack: resp.data.data }
    );

    return res.json({
      status: true,
      verified: true,
      credited_naira: koboToNaira(amount_kobo),
      credit,
    });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
};

// POST /wallet/debit
exports.debit = async (req, res) => {
  try {
    const uid = req.auth?.uid;
    if (!uid) return res.status(401).json({ error: "Not authenticated" });

    const { amount, reason } = req.body;
    if (!amount) return res.status(400).json({ error: "amount required" });

    const amount_kobo = nairaToKobo(amount);
    const txId = `DEBIT-${uid}-${Date.now()}`;

    const result = await debitWallet(uid, txId, amount_kobo, { reason });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json({
      status: true,
      remaining_naira: koboToNaira(result.remaining),
    });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
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
