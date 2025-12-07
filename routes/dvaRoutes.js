const express = require("express");
const axios = require("axios");
const admin = require("firebase-admin");

const router = express.Router();
const db = admin.firestore();

// Utility: Safe split for full name
function splitFullName(fullName) {
  if (!fullName || fullName.trim().length === 0) {
    return { firstName: "User", lastName: "User" };
  }

  const parts = fullName.trim().split(" ");

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "User"    // fallback to avoid Paystack error
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ")
  };
}

router.post("/create-dva", async (req, res) => {
  try {

    console.log("REQ BODY:", req.body);

    const { userId, name, email, phone } = req.body;

    if (!userId || !name || !email || !phone) {
      return res.status(400).json({
        status: false,
        message: "userId, name, email, phone required"
      });
    }

    const { firstName, lastName } = splitFullName(name);

    let customer_code = null;

    const walletRef = db.collection("wallets").doc(userId);
    const walletSnap = await walletRef.get();

    if (walletSnap.exists && walletSnap.data().customer_code) {
      customer_code = walletSnap.data().customer_code;
    } else {

      // Normalize phone for Paystack
      const normalizedPhone = phone.startsWith("+234")
        ? phone
        : "+234" + phone.replace(/^0/, "");

      // Create Paystack Customer
      const createCustomer = await axios.post(
        "https://api.paystack.co/customer",
        {
          email,
          first_name: firstName,
          last_name: lastName,
          phone: normalizedPhone
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      customer_code = createCustomer.data.data.customer_code;

      await walletRef.set({ customer_code }, { merge: true });
    }

    // Create Dedicated Virtual Account
    const dvaPayload = {
      customer: customer_code,
      preferred_bank: "wema-bank",
      metadata: {
        userId,
        name,
        phone,
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

    // Save DVA Details
    await walletRef.set(
      {
        dva: {
          account_number: dva.account_number,
          bank_name: dva.bank.name,
          bank_id: dva.bank.id,
          paystack_dva_id: dva.id,
          customer_id: dva.customer.id,
          customer_code: dva.customer.customer_code,
          assigned_at: dva.assignment.assigned_at,
          assignee_id: dva.assignment.assignee_id
        }
      },
      { merge: true }
    );

    return res.json({
      status: true,
      message: "DVA created successfully",
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
