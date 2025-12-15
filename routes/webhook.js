const express = require("express");
const crypto = require("crypto");
const admin = require("firebase-admin");

const router = express.Router();
const db = admin.firestore();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

/**
 * Find wallet userId by DVA account number
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
 * Idempotent credit (SAFE for webhook retries)
 * Uses wallet.balance (kobo)
 */
async function creditWallet(userId, reference, amount_kobo, meta = {}) {
  const txRef = db.collection("wallet_transactions").doc(reference);

  await db.runTransaction(async (t) => {
    const txSnap = await t.get(txRef);
    if (txSnap.exists && txSnap.data().processed === true) {
      return;
    }

    const walletRef = db.collection("wallets").doc(userId);
    const walletSnap = await t.get(walletRef);

    const prevBalance = walletSnap.exists
      ? walletSnap.data().balance || 0
      : 0;

    if (!walletSnap.exists) {
      t.set(walletRef, { balance: prevBalance + amount_kobo });
    } else {
      t.update(walletRef, { balance: prevBalance + amount_kobo });
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
 * POST /webhook/paystack
 * MUST use bodyParser.raw for Paystack signature verification
 */
router.post("/", async (req, res) => {
  const signature = req.headers["x-paystack-signature"] || "";
  const rawBody = req.body;

  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (hash !== signature) {
    console.warn("❌ Invalid Paystack signature");
    return res.sendStatus(400);
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return res.sendStatus(400);
  }

  try {
    if (event.event === "charge.success") {
      const reference = event.data.reference;
      const amount_kobo = event.data.amount;

      // 1️⃣ Try metadata userId (Paystack checkout)
      let userId = event.data.metadata?.userId || null;

      // 2️⃣ Fallback: DVA account number
      if (!userId) {
        const acct =
          event.data.authorization?.receiver_bank_account_number ||
          event.data.authorization?.account_number ||
          event.data.customer?.account_number;

        if (acct) {
          userId = await findUserIdByAccountNumber(acct);
        }
      }

      if (!userId) {
        console.warn("⚠️ No wallet matched for webhook:", reference);
        return res.sendStatus(200);
      }

      await creditWallet(userId, reference, amount_kobo, {
        webhook: event,
        channel: event.data.channel,
      });

      console.log(
        "✅ Webhook credited:",
        userId,
        "₦",
        amount_kobo / 100
      );
    }
  } catch (err) {
    console.error("🔥 Webhook processing error:", err.message);
  }

  return res.sendStatus(200);
});

module.exports = router;
