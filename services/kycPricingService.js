const admin = require("firebase-admin");

const db = admin.firestore();
const kycServicesCol = () => db.collection("kyc_services");

// Default KYC prices
const DEFAULT_KYC_SERVICES = [
  {
    service: "nin_basic",
    name: "NIN Basic",
    dojahCost: 150,
    userPrice: 200,
    isActive: true,
  },
  {
    service: "nin_slip",
    name: "NIN Slip",
    dojahCost: 150,
    userPrice: 200,
    isActive: true,
  },
  {
    service: "nin_advanced",
    name: "NIN Advanced",
    dojahCost: 150,
    userPrice: 200,
    isActive: true,
  },
  {
    service: "nin_premium",
    name: "NIN Premium",
    dojahCost: 150,
    userPrice: 200,
    isActive: true,
  },
  {
    service: "bvn_full",
    name: "BVN Full",
    dojahCost: 150,
    userPrice: 200,
    isActive: true,
  },
  {
    service: "bvn_validation",
    name: "BVN Validation",
    dojahCost: 150,
    userPrice: 200,
    isActive: true,
  },
  {
    service: "phone_basic",
    name: "Phone Basic",
    dojahCost: 180,
    userPrice: 200,
    isActive: true,
  },
  {
    service: "age_verification",
    name: "Age Verification",
    dojahCost: 180,
    userPrice: 200,
    isActive: true,
  },
];

// Initialize default services
async function initializeKycServices() {
  const batch = db.batch();

  for (const service of DEFAULT_KYC_SERVICES) {
    const ref = kycServicesCol().doc(service.service);

    const snap = await ref.get();

    if (!snap.exists) {
      batch.set(ref, {
        ...service,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  await batch.commit();

  console.log("KYC pricing initialized");
}

// Get all KYC services
async function getAllKycServices() {
  const snap = await kycServicesCol().orderBy("name").get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// Get one KYC service
async function getKycService(service) {
  const ref = kycServicesCol().doc(service);
  const snap = await ref.get();

  if (!snap.exists) {
    return null;
  }

  return {
    id: snap.id,
    ...snap.data(),
  };
}

// Update KYC service
async function updateKycService(service, updates) {
  const ref = kycServicesCol().doc(service);

  const snap = await ref.get();

  if (!snap.exists) {
    return null;
  }

  await ref.update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();

  return {
    id: updated.id,
    ...updated.data(),
  };
}

module.exports = {
  initializeKycServices,
  getAllKycServices,
  getKycService,
  updateKycService,
};