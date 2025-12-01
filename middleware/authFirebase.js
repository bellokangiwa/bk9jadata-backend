// middleware/authFirebase.js
const admin = require("firebase-admin");

/**
 * Verify Firebase ID token from Authorization: Bearer <idToken>
 * Attaches req.auth = { uid, email } on success.
 */
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const idToken = authHeader.split(" ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.auth = { uid: decoded.uid, email: decoded.email };
    return next();
  } catch (err) {
    console.error("Firebase token verify error:", err.message);
    return res.status(401).json({ error: "Invalid auth token" });
  }
}

module.exports = verifyFirebaseToken;
