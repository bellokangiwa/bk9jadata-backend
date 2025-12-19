const express = require("express");
const axios = require("axios");
require("dotenv").config();

const router = express.Router();

router.post("/paystack-init", async (req, res) => {
  try {
    const { email, amount, userId } = req.body;

    if (!email || !amount || !userId) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const payload = {
      email: email,
      amount: amount * 100, // Convert to kobo
      metadata: {
        userId: userId,
        email: email,
      }
    };

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.json(response.data);
  } catch (error) {
    return res.status(500).json({
      error: error.response?.data || error.message,
    });
  }
});

module.exports = router;
