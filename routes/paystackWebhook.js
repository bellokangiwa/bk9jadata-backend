const express = require("express");
const admin = require("firebase-admin");
const crypto = require("crypto");

const router = express.Router();
const db = admin.firestore();

router.post("/", async (req, res) => {
  const rawBody = req.body; // Buffer from bodyParser.raw

  // Verify Paystack signature
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody) // must be raw Buffer
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    console.warn("Invalid signature");
    return res.status(400).send("Invalid signature");
  }

  // Parse JSON manually
  let event;
  try {
    event = JSON.parse(rawBody.toString());
  } catch (e) {
    console.error("Webhook JSON parse error:", e.message);
    return res.status(400).send("Bad payload");
  }

  try {
    // Handle dedicated account transaction
    if (event.event === "dedicatedaccount_transaction") {
      const data = event.data;
      const userId = data.metadata?.userId;
      const amount = data.amount / 100; // kobo → naira

      if (!userId) return res.status(400).json({ message: "Missing userId" });

      const userWalletRef = db.collection("wallets").doc(userId);

      await db.runTransaction(async (t) => {
        const doc = await t.get(userWalletRef);
        const previousBalance = doc.data()?.balance || 0;
        t.update(userWalletRef, { balance: previousBalance + amount });
      });

      console.log("Wallet credited successfully:", userId, amount);
    }

    // Optionally, handle charge.success (for regular Paystack payments)
    if (event.event === "charge.success") {
      const data = event.data;
      const userId = data.metadata?.userId;
      const amount = data.amount; // Paystack returns in kobo

      if (userId) {
        const userWalletRef = db.collection("wallets").doc(userId);
        await db.runTransaction(async (t) => {
          const doc = await t.get(userWalletRef);
          const prev = doc.data()?.balance_kobo || 0;
          t.update(userWalletRef, { balance_kobo: prev + amount });
        });
        console.log("Wallet credited from charge.success:", userId, amount);
      } else {
        console.warn("charge.success webhook received but no userId in metadata");
      }
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).send("Webhook error");
  }
});

module.exports = router;
