// middleware/adminAuth.js
const admin = require("firebase-admin");

async function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    // 🔍 Check Firestore for admin record
    const adminDoc = await admin.firestore()
      .collection("admins")
      .doc(uid)
      .get();

    if (!adminDoc.exists) {
      return res.status(403).json({ error: "Not an admin" });
    }

    // ✅ Attach admin info to request
    req.admin = {
      uid,
      email: decoded.email,
      ...adminDoc.data(),
    };

    next();
  } catch (err) {
    console.error("Admin verification error:", err);
    return res.status(401).json({ error: "Invalid admin token" });
  }
}

module.exports = verifyAdmin;