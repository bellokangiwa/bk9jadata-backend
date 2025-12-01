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
// 1. Initialize Firebase (Using Render ENV variables)
// -----------------------------
const admin = require("firebase-admin");

const serviceAccount = {
  type: process.env.type,
  project_id: process.env.project_id,
  private_key_id: process.env.private_key_id,
  private_key: process.env.private_key ? process.env.private_key.replace(/\\n/g, '\n') : undefined,
  client_email: process.env.client_email,
  client_id: process.env.client_id,
  auth_uri: process.env.auth_uri,
  token_uri: process.env.token_uri,
  auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
  client_x509_cert_url: process.env.client_x509_cert_url,
  universe_domain: process.env.universe_domain
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase initialized with ENV variables");
} catch (error) {
  console.error("Firebase initialization failed:", error.message);
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
