// controllers/adminController.js
const Transaction = require("../models/Transaction");

exports.getAllTransactions = async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = 20;
  const skip = (page - 1) * limit;

  const transactions = await Transaction.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Transaction.countDocuments();

  res.json({
    page,
    total,
    transactions,
  });
};
exports.getTransactionById = async (req, res) => {
  const tx = await Transaction.findById(req.params.id);
  if (!tx) return res.status(404).json({ error: "Not found" });

  res.json(tx);
};
exports.verifyTransactionManually = async (req, res) => {
  const tx = await Transaction.findById(req.params.id);
  if (!tx) return res.status(404).json({ error: "Not found" });

  // Example for ClubKonnect
  const response = await axios.get(
    `https://www.nellobytesystems.com/APIQuery.asp`,
    {
      params: {
        UserID: process.env.CLUBKONNECT_USER_ID,
        APIKey: process.env.CLUBKONNECT_API_KEY,
        RequestID: tx.requestId,
      },
    }
  );

  tx.providerResponse = response.data;

  if (response.data?.status === "success") {
    tx.status = "success";
  } else {
    tx.status = "failed";
  }

  await tx.save();

  res.json({ message: "Verification complete", tx });
};

const admin = require("firebase-admin");

// 🔐 Admin reset user password
exports.resetUserPassword = async (req, res) => {
  try {
    const { uid, newPassword } = req.body;

    // 1️⃣ Validate input
    if (!uid || !newPassword) {
      return res.status(400).json({
        error: "uid and newPassword are required",
      });
    }

    // 2️⃣ Enforce 6-digit password
    if (!/^\d{6}$/.test(newPassword)) {
      return res.status(400).json({
        error: "Password must be exactly 6 digits",
      });
    }

    // 3️⃣ Update password using Firebase Admin SDK
    await admin.auth().updateUser(uid, {
      password: newPassword,
    });

    // 4️⃣ (Optional but recommended)
    // Force user to login again everywhere
    await admin.auth().revokeRefreshTokens(uid);

    return res.json({
      message: "Password reset successfully",
    });

  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      error: "Failed to reset password",
    });
  }
};
exports.getTransactionsByStatus = async (req, res) => {
  try {
    const { status } = req.query;

    if (!status) {
      return res.status(400).json({
        error: "Status query is required (e.g. ?status=success)",
      });
    }

  const transactions = await Transaction.find({ status })
      .sort({ createdAt: -1 });

    return res.json({
      status: true,
      count: transactions.length,
      transactions,
    });

  } catch (err) {
    console.error("Get transactions by status error:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};
