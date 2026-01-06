const express = require("express");
const axios = require("axios");
const admin = require("firebase-admin");

const router = express.Router();
const db = admin.firestore();

/**
 * Utility: Safe split for full name
 * Paystack requires both first & last name
 */
function splitFullName(fullName) {
  if (!fullName || fullName.trim().length === 0) {
    return { firstName: "User", lastName: "User" };
  }

  const parts = fullName.trim().split(" ");

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "User" // fallback to avoid Paystack error
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ")
  };
}

/**
 * CREATE / FETCH DEDICATED VIRTUAL ACCOUNT
 */
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

    const walletRef = db.collection("wallets").doc(userId);
    const walletSnap = await walletRef.get();

    /**
     * 🔐 STEP 1: If DVA already exists → RETURN IT (no duplication)
     */
    if (walletSnap.exists && walletSnap.data()?.dva?.account_number) {
      return res.json({
        status: true,
        message: "DVA already exists",
        data: walletSnap.data().dva
      });
    }

    const { firstName, lastName } = splitFullName(name);

    let customer_code = null;

    /**
     * 🔐 STEP 2: Get or create Paystack customer
     */
    if (walletSnap.exists && walletSnap.data()?.customer_code) {
      customer_code = walletSnap.data().customer_code;
    } else {
      // Normalize Nigerian phone number
      const normalizedPhone = phone.startsWith("+234")
        ? phone
        : "+234" + phone.replace(/^0/, "");

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

      // Save customer_code safely
      await walletRef.set(
        { customer_code },
        { merge: true }
      );
    }

    /**
     * 🔐 STEP 3: Create Dedicated Virtual Account (DVA)
     */
    const dvaResponse = await axios.post(
      "https://api.paystack.co/dedicated_account",
      {
        customer: customer_code,
        preferred_bank: "wema-bank",
        metadata: {
          userId,
          name,
          phone,
          purpose: "wallet_fund"
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const dva = dvaResponse.data.data;

    /**
     * 🔐 STEP 4: Save DVA details (NO STRUCTURE CHANGE)
     */
    await walletRef.set(
      {
        dva: {
          account_number: dva.account_number,
          account_name: dva.account_name,
          bank_name: dva.bank.name,
          bank_id: dva.bank.id,
          bank_slug: dva.bank.slug,
          currency: dva.currency,
          active: dva.active,

          paystack_dva_id: dva.id,
          customer_id: dva.customer.id,
          customer_code: dva.customer.customer_code,

          assigned: dva.assigned,
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