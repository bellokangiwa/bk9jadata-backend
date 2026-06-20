const Transaction = require("../models/Transaction");
const admin = require("firebase-admin");

exports.getRevenueStats = async (req, res) => {
  try {
    const db = admin.firestore();

    // ===== USERS =====
    const usersSnapshot = await db.collection("users").get();
    const totalUsers = usersSnapshot.size;

    // ===== WALLETS =====
    const walletsSnapshot = await db.collection("wallets").get();

    let totalWalletBalance = 0;

    walletsSnapshot.forEach((doc) => {
      totalWalletBalance += doc.data().balance || 0;
    });

    // ===== TRANSACTIONS =====
    const totalTransactions =
      await Transaction.countDocuments();

    const successfulTransactions =
      await Transaction.countDocuments({
        status: "success",
      });

    const failedTransactions =
      await Transaction.countDocuments({
        status: "failed",
      });

    // ===== SALES =====
    const successfulTx =
      await Transaction.find({
        status: "success",
      });

    let totalSales = 0;

    successfulTx.forEach((tx) => {
      totalSales += Number(tx.amount || 0);
    });

    return res.json({
      status: true,

      totalUsers,

      totalTransactions,

      successfulTransactions,

      failedTransactions,

      totalSales,

      totalWalletBalance:
          totalWalletBalance / 100,
    });

  } catch (e) {
    console.error(e);

    res.status(500).json({
      error: e.message,
    });
  }
};