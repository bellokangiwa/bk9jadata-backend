// server.js — BK9JA Wallet System (Paystack + ClubKonnect + Firestore)

require("dotenv").config();
const express = require("express");
const axios = require("./node_modules/axios/index.d.cts");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

// -----------------------------
// 1. Initialize Firebase
// -----------------------------
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT || "./serviceAccountKey.json";

if (!fs.existsSync(serviceAccountPath)) {
  console.warn("Warning: Firebase service account not found:", serviceAccountPath);
}

try {
  const svc = require(path.resolve(serviceAccountPath));
  admin.initializeApp({ credential: admin.credential.cert(svc) });
} catch (err) {
  try {
    admin.initializeApp();
  } catch (e) {
    console.error("Firebase init error:", e.message);
  }
}

// -----------------------------
// 2. Paystack Webhook MUST come before express.json()
// -----------------------------
const paystackWebhook = require("./routes/paystackWebhook");
app.use(
  "/webhook/paystack",
  bodyParser.raw({ type: "application/json" }),
  paystackWebhook
);

// -----------------------------
// 3. Main middleware
// -----------------------------
app.use(cors());
app.use(express.json());

// Log every request
app.use((req, res, next) => {
  console.log("REQUEST:", req.method, req.path);
  next();
});

// -----------------------------
// 4. Import Routes
// -----------------------------
const walletRoutes = require("./routes/walletRoutes");
const vtuRoutes = require("./routes/vtuRoutes");
const paystackRoutes = require("./routes/paystack");
const dvaRoutes = require("./routes/dvaRoutes");

// -----------------------------
// 5. Mount routes
// -----------------------------
app.use("/api/vtu", vtuRoutes);
app.use("/api/paystack", paystackRoutes);
app.use("/api/dva", dvaRoutes);
app.use("/api/wallet", walletRoutes);

// -----------------------------
// 6. Health Check
// -----------------------------
app.get("/", (req, res) => res.send("BK9JA Wallet Backend running"));

// -----------------------------
// 7. Debug route print
// -----------------------------
console.log("=== Registered routes ===");
app._router.stack.forEach((r) => {
  if (r.route && r.route.path) {
    const method = r.route.stack[0].method.toUpperCase();
    console.log(method, r.route.path);
  }
});
console.log("=========================");

// -----------------------------
// 8. Start server
// -----------------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`BK9JA Wallet backend running on port ${PORT}`)
);
