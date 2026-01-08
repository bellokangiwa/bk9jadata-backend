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
  console.log("🔍 Searching wallet for account:", accountNumber);

  if (!accountNumber) {
    console.log("❌ accountNumber is empty");
    return null;
  }

  const snap = await db
    .collection("wallets")
    .where("dva.account_number", "==", String(accountNumber))
    .limit(1)
    .get();

  if (snap.empty) {
    console.log("❌ No wallet matched account:", accountNumber);
    return null;
  }

  const userId = snap.docs[0].id;
  console.log("✅ Wallet found, userId:", userId);
  return userId;
}

/**
 * Credit wallet safely (idempotent)
 */
async function creditWallet(userId, reference, amount_kobo, meta = {}) {
  console.log("💰 Crediting wallet:", {
    userId,
    reference,
    amount_kobo,
  });

  const txRef = db.collection("wallet_transactions").doc(reference);

  await db.runTransaction(async (t) => {
    const txSnap = await t.get(txRef);

    if (txSnap.exists && txSnap.data().processed === true) {
      console.log("🔁 Duplicate webhook ignored:", reference);
      return;
    }

    const walletRef = db.collection("wallets").doc(userId);
    const walletSnap = await t.get(walletRef);

    const prevBalance = walletSnap.exists
      ? walletSnap.data().balance || 0
      : 0;

    console.log("📊 Previous balance:", prevBalance);

    if (!walletSnap.exists) {
      console.log("⚠️ Wallet doc missing, creating new");
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

    console.log(
      "✅ Wallet credited. New balance:",
      prevBalance + amount_kobo
    );
  });
}

/**
 * PAYSTACK WEBHOOK
 */
router.post("/", async (req, res) => {
  console.log("🔔 WEBHOOK HIT");

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

  console.log("✅ Signature verified");

  let event;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return res.sendStatus(400);
  }

  console.log("📦 Event received:", event.event);

  try {

    /**
     * ===============================
     * 1️⃣ DVA FUNDING (YOUR MAIN CASE)
     * ===============================
     */
    if (
      event.event === "charge.success" &&
      event.data.channel === "dedicated_nuban"
    ) {
      console.log("🏦 DVA transaction detected");

      const amount_kobo = event.data.amount;
      const reference = event.data.reference;

      // Paystack sends account number here
      const accountNumber =
        event.data.authorization?.receiver_bank_account_number ||
        event.data.authorization?.account_number;

      console.log("💡 Account number:", accountNumber);

      if (!accountNumber) {
        console.log("❌ No account number found");
        return res.sendStatus(200);
      }

      const userId = await findUserIdByAccountNumber(accountNumber);

      if (!userId) {
        console.log("❌ No wallet mapped to account:", accountNumber);
        return res.sendStatus(200);
      }

      await creditWallet(userId, reference, amount_kobo, {
        channel: "DVA",
        paystack_event: event,
      });

      console.log("✅ DVA wallet credited:", userId);
    }

    /**
     * ===============================
     * 2️⃣ NORMAL CHECKOUT FUNDING
     * ===============================
     */
    else if (event.event === "charge.success") {
      console.log("💳 Checkout transaction detected");

      const reference = event.data.reference;
      const amount_kobo = event.data.amount;

      const userId = event.data.metadata?.userId;

      if (!userId) {
        console.log("❌ userId missing in metadata");
        return res.sendStatus(200);
      }

      await creditWallet(userId, reference, amount_kobo, {
        channel: event.data.channel,
        paystack_event: event,
      });

      console.log("✅ Checkout wallet credited:", userId);
    }

  } catch (err) {
    console.error("🔥 Webhook processing error:", err.message);
  }

  return res.sendStatus(200);
});