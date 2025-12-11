const express = require("express");
const crypto = require("crypto");
const admin = require("firebase-admin");

const router = express.Router();
const db = admin.firestore();

async function findUserIdByAccountNumber(accountNumber) {
  if (!accountNumber) return null;
  const q = await db
    .collection("wallets")
    .where("dva.account_number", "==", accountNumber)
    .limit(1)
    .get();
  if (q.empty) return null;
  return q.docs[0].id;
}

router.post("/", async (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  const raw = req.body; // Buffer

  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(raw)
    .digest("hex");

  if (hash !== signature) {
    console.warn("Invalid signature");
    return res.status(400).send("Invalid signature");
  }

  let event;
  try {
    event = JSON.parse(raw.toString());
  } catch {
    return res.status(400).send("Bad JSON");
  }

  try {
    if (event.event === "charge.success") {
      const reference = event.data.reference;
      const amount_kobo = event.data.amount;

      // Step 1: Try metadata first
      let userId = event.data.metadata?.userId || null;

      // Step 2: If metadata missing → DVA fallback matching
      if (!userId) {
        const possibleAccounts = [
          event.data.account_number,
          event.data.customer?.account_number,
          event.data.recipient?.account_number,
          event.data.display_account
        ];

        const account = possibleAccounts.find(Boolean);
        if (account) {
          userId = await findUserIdByAccountNumber(String(account));
        }
      }

      if (userId) {
        const walletRef = db.collection("wallets").doc(userId);

        await db.runTransaction(async (t) => {
          const snap = await t.get(walletRef);
          const prev = snap.data()?.balance_kobo || 0;
          t.update(walletRef, { balance_kobo: prev + amount_kobo });
        });

        console.log("DVA wallet funded:", userId, amount_kobo);
      } else {
        console.warn(
          "DVA webhook received but userId could not be found:",
          reference
        );
      }
    }
  } catch (e) {
    console.error("Webhook error:", e);
  }

  return res.status(200).send("ok");
});

module.exports = router;
