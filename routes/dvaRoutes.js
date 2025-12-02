const express = require("express");
const axios = require("axios");
const admin = require("firebase-admin");

const db = admin.firestore();
const router = express.Router();

router.post("/create-dva", async (req, res) => {
  try {
    const { userId, name, email } = req.body;

    if (!userId || !name || !email) {
      return res.status(400).json({
        status: false,
        message: "userId, name, email required"
      });
    }

    // Paystack DVA payload
    const payload = {
      customer: email,
      preferred_bank: "wema-bank",
      metadata: {
        userId,
        name,
        purpose: "wallet_fund_dva"
      }
    };

    // Create DVA at Paystack
    const response = await axios.post(
      "https://api.paystack.co/dedicated_account",
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const dva = response.data.data;

    // Store DVA in Firestore under wallets/{userId}/dva
    await db.collection("wallets").doc(userId).set({
      dva: {
        account_number: dva.account_number,
        bank_name: dva.bank.name,
        bank_id: dva.bank.id,
        paystack_dva_id: dva.id,
        customer_id: dva.customer_id
      }
    }, { merge: true });

    return res.json({
      status: true,
      message: "DVA created & stored",
      data: dva
    });

  } catch (err) {
    console.error("DVA ERROR:", err.response?.data || err.message);
    return res.status(500).json({
      status: false,
      error: err.response?.data || err.message
    });
  }
});

module.exports = router;
