const express = require("express");
const axios = require("axios");
require("dotenv").config();

const router = express.Router();

router.post("/paystack-test", async (req, res) => {
  try {
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: "test@example.com",
        amount: 5000,   // ₦50 test payment
      },
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
