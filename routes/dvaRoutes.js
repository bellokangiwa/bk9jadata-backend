const express = require("express");
const axios = require("axios");
const admin = require("firebase-admin");

const router = express.Router();
const db = admin.firestore();

router.post("/create-dva", async (req, res) => {
  try {
    const { userId, name, email, phone } = req.body;

if (!userId || !name || !email || !phone) {
  return res.status(400).json({
    status: false,
    message: "userId, name, email, phone required"
  });
}


    // ---------------------------------------------------
    // 1. CHECK IF PAYSTACK CUSTOMER EXISTS OR CREATE NEW
    // ---------------------------------------------------
    let customer_code = null;

    // Check Firestore
    const walletRef = db.collection("wallets").doc(userId);
    const walletSnap = await walletRef.get();

    if (walletSnap.exists && walletSnap.data().customer_code) {
      customer_code = walletSnap.data().customer_code;
    } else {
      // Create customer in Paystack
      const createCustomer = await axios.post(
  "https://api.paystack.co/customer",
  {
    email,
    first_name: name,
    last_name: "",
    phone: phone   // FIXED HERE
  },
  {
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json"
    }
  }
);

      customer_code = createCustomer.data.data.customer_code;

      // Store customer_code in Firestore
      await walletRef.set(
        { customer_code },
        { merge: true }
      );
    }

    // ---------------------------------------------------
    // 2. CREATE DVA USING CUSTOMER_CODE
    // ---------------------------------------------------
    const dvaPayload = {
      customer: customer_code,
      preferred_bank: "wema-bank",
      metadata: {
        userId,
        name,
        purpose: "wallet_fund"
      }
    };

    const dvaResponse = await axios.post(
      "https://api.paystack.co/dedicated_account",
      dvaPayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const dva = dvaResponse.data.data;

    // ---------------------------------------------------
    // 3. SAVE DVA TO FIRESTORE
    // ---------------------------------------------------
    await walletRef.set(
      {
        dva: {
          account_number: dva.account_number,
          bank_name: dva.bank.name,
          bank_id: dva.bank.id,
          paystack_dva_id: dva.id,
          customer_id: dva.customer_id
        }
      },
      { merge: true }
    );

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
