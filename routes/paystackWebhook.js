const express = require("express");
const admin = require("firebase-admin");
const crypto = require("crypto");

const router = express.Router();
const db = admin.firestore();

router.post("/", async (req, res) => {
  const event = req.body;

  // Verify Paystack signature
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(req.body)
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    return res.status(400).send("Invalid signature");
  }

  try {
    if (event.event === "dedicatedaccount_transaction") {
      const data = event.data;

      const userId = data.metadata?.userId;
      const amount = data.amount / 100; // kobo → naira

      if (!userId) return res.status(400).json({ message: "Missing userId" });

      // Update wallet balance atomically
      const userWalletRef = db.collection("wallets").doc(userId);

      await db.runTransaction(async (t) => {
        const doc = await t.get(userWalletRef);
        const previousBalance = doc.data()?.balance || 0;
        const newBalance = previousBalance + amount;
        t.update(userWalletRef, { balance: newBalance });
      });

      console.log("Wallet credited successfully:", userId, amount);
    }

    res.status(200).send("OK");
  } catch (e) {
    console.error("WEBHOOK ERROR:", e);
    res.status(500).send("Webhook error");
  }
});

module.exports = router;
