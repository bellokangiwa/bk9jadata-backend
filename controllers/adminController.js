// controllers/adminController.js
const Transaction = require("../models/Transaction");
const { creditWalletIdempotent } =require("./walletController");
const { debitWallet } =require("./walletController");
const createAdminLog =require("../utils/adminLog");

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

if (!uid || !newPassword) {
  return res.status(400).json({
    error: "uid and newPassword are required",
  });
}

if (!/^\d{6}$/.test(newPassword)) {
  return res.status(400).json({
    error: "Password must be exactly 6 digits",
  });
}

await admin.auth().updateUser(uid, {
  password: newPassword,
});

await admin.auth().revokeRefreshTokens(uid);

await createAdminLog({
  action: "RESET_PASSWORD",
  adminUid: req.admin.uid,
  adminEmail: req.admin.email,
  targetUser: uid,
  details: "Password reset by admin",
});

return res.json({
  success: true,
  message: "Password reset successfully",
});

} catch (error) {
console.error(error);

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
// ===== CREDIT USER WALLET =====


exports.creditUserWallet = async (req, res) => {
try {

const { uid, amount } = req.body;

if (!uid || !amount) {
  return res.status(400).json({
    error: "uid and amount required",
  });
}

const amountKobo =
  Number(amount) * 100;

const txId =
  "ADMIN-CREDIT-" + Date.now();

await creditWalletIdempotent(
  uid,
  txId,
  amountKobo,
  {
    reason: "admin_credit",
    admin: req.admin.uid,
  }
);

await createAdminLog({
  action: "CREDIT_WALLET",
  adminUid: req.admin.uid,
  adminEmail: req.admin.email,
  targetUser: uid,
  details: `₦${amount} credited`,
});

return res.json({
  success: true,
  message: "Wallet credited successfully",
});

} catch (e) {

console.error(e);

return res.status(500).json({
  error: e.message,
});

}
};
// =======Debit User Wallet==========
exports.debitUserWallet = async (req, res) => {
try {

const { uid, amount } = req.body;

if (!uid || !amount) {
  return res.status(400).json({
    error: "uid and amount required",
  });
}

const amountKobo =
  Number(amount) * 100;

const txId =
  "ADMIN-DEBIT-" + Date.now();

const result =
  await debitWallet(
    uid,
    txId,
    amountKobo,
    {
      reason: "admin_debit",
      admin: req.admin.uid,
    }
  );

if (!result.success) {
  return res.status(400).json({
    error:
      result.reason ||
      "Debit failed",
  });
}

await createAdminLog({
  action: "DEBIT_WALLET",
  adminUid: req.admin.uid,
  adminEmail: req.admin.email,
  targetUser: uid,
  details: `₦${amount} debited`,
});

return res.json({
  success: true,
  message:
    "Wallet debited successfully",
});

} catch (e) {

console.error(e);

return res.status(500).json({
  error: e.message,
});

}
};
