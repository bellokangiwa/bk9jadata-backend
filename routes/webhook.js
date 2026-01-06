const express = require("express");
const crypto = require("crypto");
const admin = require("firebase-admin");

const router = express.Router();
const db = admin.firestore();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

/**
 * Find wallet userId by DVA account number
 * Firestore structure stays the same
 */
async function findUserIdByAccountNumber(accountNumber) {
  if (!accountNumber) return null;

  const snap = await db
    .collection("wallets")
    .where("dva.account_number", "==", String(accountNumber))
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].id;
}

/**
 * Credit wallet safely (idempotent)
 * Uses kobo
 */
async function creditWallet(userId, reference, amount_kobo, meta = {}) {
  const txRef = db.collection("wallet_transactions").doc(reference);

  await db.runTransaction(async (t) => {
    const txSnap = await t.get(txRef);
    if (txSnap.exists && txSnap.data().processed === true) return;

    const walletRef = db.collection("wallets").doc(userId);
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
        source: "paystack_webhook",
        meta,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

/**
 * Paystack Webhook
 * MUST use bodyParser.raw
 */
router.post("/", async (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  const rawBody = req.body;

  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (hash !== signature) {
    console.log("❌ Invalid signature");
    return res.sendStatus(400);
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return res.sendStatus(400);
  }

  try {
    /**
     * ===============================
     * DVA PAYMENT (THIS IS YOUR CASE)
     * ===============================
     */
    if (event.event === "dedicated_account.transaction.success") {
      const data = event.data;

      const reference = data.reference;
      const amount_kobo = data.amount;

      /**
       * 🔑 PAYSTACK REALITY:
       * Account number can come from ANY of these
       */
      const accountNumber =
        data.account_number ||
        data.dedicated_account?.account_number ||
        data.customer?.account_number ||
        data.metadata?.account_number;

      console.log("💡 DVA ACCOUNT:", accountNumber);

      if (!accountNumber) {
        console.log("⚠️ Account number missing in webhook");
        return res.sendStatus(200);
      }

      const userId = await findUserIdByAccountNumber(accountNumber);

      if (!userId) {
        console.log("⚠️ No wallet found for:", accountNumber);
        return res.sendStatus(200);
      }

      await creditWallet(userId, reference, amount_kobo, {
        channel: "DVA",
        paystack_event: event,
      });

      console.log("✅ DVA wallet credited:", userId, amount_kobo / 100);
    }

    /**
     * ===============================
     * NORMAL PAYSTACK CHECKOUT
     * ===============================
     */
    if (event.event === "charge.success") {
      const reference = event.data.reference;
      const amount_kobo = event.data.amount;

      const userId = event.data.metadata?.userId;
      if (!userId) return res.sendStatus(200);

      await creditWallet(userId, reference, amount_kobo, {
        channel: event.data.channel,
        paystack_event: event,
      });

      console.log("✅ Checkout wallet credited:", userId);
    }

  } catch (err) {
    console.error("🔥 Webhook error:", err.message);
  }

  return res.sendStatus(200);
});

module.exports = router;