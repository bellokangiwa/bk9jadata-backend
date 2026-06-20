const admin = require("firebase-admin");
const db = admin.firestore();

async function createAdminLog({
  action,
  adminUid,
  adminEmail,
  targetUser,
  details,
}) {
  await db.collection("admin_logs").add({
    action,
    adminUid,
    adminEmail,
    targetUser,
    details,
    createdAt:
      admin.firestore.FieldValue.serverTimestamp(),
  });
}

module.exports = createAdminLog;