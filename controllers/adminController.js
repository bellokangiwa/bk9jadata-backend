// controllers/adminController.js
const Transaction = require("../models/Transaction");
const { creditWalletIdempotent } =require("./walletController");
const { debitWallet } =require("./walletController");
const createAdminLog =require("../utils/adminLog");
const clubKonnectService = require("../services/clubkonnectService");
const smeplugService = require("../services/smeplugService");

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
// ==========================================
// GET ALL TRANSACTIONS
// ==========================================
exports.getAllTransactions = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.max(Number(req.query.limit || 100), 1);
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Transaction.countDocuments();

    return res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      transactions,
    });
  } catch (error) {
    console.error("Get all transactions error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to load transactions",
      message: error.message,
    });
  }
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

await admin.firestore()
.collection("users")
.doc(uid)
.update({
    mustChangePassword: true,
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
// ==========================================
// GET TRANSACTIONS BY STATUS
// ==========================================
exports.getTransactionsByStatus = async (req, res) => {
  try {
    const { status } = req.query;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: "Status query is required",
      });
    }

    const allowedStatuses = [
      "pending",
      "success",
      "failed",
    ];

    if (!allowedStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: "Invalid transaction status",
      });
    }

    const transactions = await Transaction.find({
      status: status.toLowerCase(),
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      success: true,
      status: status.toLowerCase(),
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error("Get transactions by status error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to load transactions",
      message: error.message,
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
// ============================================================
// GET CLUBKONNECT + SMEPLUG BALANCES
// ============================================================
exports.getProviderBalances = async (req, res) => {
  try {
    console.log("==========================================");
    console.log("LOADING PROVIDER BALANCES...");
    console.log("==========================================");

    const [clubKonnect, smeplug] = await Promise.all([
      clubKonnectService.getBalance(),
      smeplugService.getBalance(),
    ]);

    console.log("==========================================");
    console.log("PROVIDER BALANCES LOADED");
    console.log("==========================================");

    return res.json({
      success: true,
      clubKonnect,
      smeplug,
    });
  } catch (error) {
    console.error(
      "Provider balance controller error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Failed to load provider balances",
      message: error.message,
    });
  }
};