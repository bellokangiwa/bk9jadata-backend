const admin = require("firebase-admin");

const db = admin.firestore();

const kycServicesCol = () =>
  db.collection("kyc_services");

// ==========================================
// DEFAULT KYC SERVICES PRICING
// Provider: TechHub
// ==========================================

const DEFAULT_KYC_SERVICES = [
  // ==========================================================
  // NIN BY NIN
  // ==========================================================

  {
    service: "nin_basic",
    name: "NIN Basic",
    providerCost: 50,
    userPrice: 150,
    isActive: true,
  },

  {
    service: "nin_standard_slip",
    name: "NIN Standard Slip",
    providerCost: 50,
    userPrice: 150,
    isActive: true,
  },

  {
    service: "nin_regular_slip",
    name: "NIN Regular Slip",
    providerCost: 50,
    userPrice: 150,
    isActive: true,
  },

  {
    service: "nin_vnin_slip",
    name: "NIN VNIN Slip",
    providerCost: 50,
    userPrice: 150,
    isActive: true,
  },


  // ==========================================================
  // NIN WITH PHONE
  // ==========================================================

  {
    service: "nin_phone_premium",
    name: "NIN by Phone Premium",
    providerCost: 130,
    userPrice: 200,
    isActive: true,
  },

  {
    service: "nin_phone_standard",
    name: "NIN by Phone Standard",
    providerCost: 130,
    userPrice: 200,
    isActive: true,
  },

  {
    service: "nin_phone_regular",
    name: "NIN by Phone Regular",
    providerCost: 130,
    userPrice: 200,
    isActive: true,
  },


  // ==========================================================
  // NIN BY DEMO
  // ==========================================================

  {
    service: "nin_demo",
    name: "NIN by Demo",
    providerCost: 130,
    userPrice: 200,
    isActive: true,
  },

  {
    service: "nin_demo_standard_slip",
    name: "NIN Demo Standard Slip",
    providerCost: 130,
    userPrice: 200,
    isActive: true,
  },

  {
    service: "nin_demo_regular_slip",
    name: "NIN Demo Regular Slip",
    providerCost: 130,
    userPrice: 200,
    isActive: true,
  },

  {
    service: "nin_demo_vnin_slip",
    name: "NIN Demo VNIN Slip",
    providerCost: 130,
    userPrice: 200,
    isActive: true,
  },


  // ==========================================================
  // BVN
  // ==========================================================

  {
    service: "bvn_premium",
    name: "BVN Premium",
    providerCost: 150,
    userPrice: 200,
    isActive: true,
  },

  {
    service: "bvn_full",
    name: "BVN Full Details",
    providerCost: 150,
    userPrice: 200,
    isActive: true,
  },
];


// ==========================================
// INITIALIZE DEFAULT SERVICES
// ==========================================

async function initializeKycServices() {
  const batch = db.batch();

  for (const service of DEFAULT_KYC_SERVICES) {
    const ref = kycServicesCol().doc(service.service);

    const snap = await ref.get();

    if (!snap.exists) {
      batch.set(ref, {
        ...service,

        provider: "techhub",

        createdAt:
          admin.firestore.FieldValue.serverTimestamp(),

        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  await batch.commit();

  console.log(
    "TechHub KYC pricing initialized successfully"
  );
}


// ==========================================
// GET ALL KYC SERVICES
// ==========================================

async function getAllKycServices() {
  const snap = await kycServicesCol()
    .orderBy("name")
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}


// ==========================================
// GET ONE KYC SERVICE
// ==========================================

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


// ==========================================
// UPDATE KYC SERVICE
// ==========================================

async function updateKycService(service, updates) {
  const ref = kycServicesCol().doc(service);

  const snap = await ref.get();

  if (!snap.exists) {
    return null;
  }

  await ref.update({
    ...updates,

    updatedAt:
      admin.firestore.FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();

  return {
    id: updated.id,
    ...updated.data(),
  };
}


// ==========================================
// EXPORT
// ==========================================

module.exports = {
  initializeKycServices,
  getAllKycServices,
  getKycService,
  updateKycService,
};
