// middleware/adminAuth.js
const admin = require("firebase-admin");

const ADMIN_UIDS = [
  "ADMIN_FIREBASE_UID_1",
  "ADMIN_FIREBASE_UID_2",
];

async function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    if (!ADMIN_UIDS.includes(decoded.uid)) {
      return res.status(403).json({ error: "Not an admin" });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid admin token" });
  }
}

module.exports = verifyAdmin;