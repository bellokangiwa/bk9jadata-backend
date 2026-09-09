// services/kycBillingService.js

const admin = require("firebase-admin");

const {
  getKycService,
} = require("./kycPricingService");

const {
  nairaToKobo,
  koboToNaira,
} = require("../utils/fees");

const {
  debitWallet,
  creditWalletIdempotent,
} = require("../controllers/walletController");

const db = admin.firestore();

const kycTransactionsCol = () =>
  db.collection("kyc_transactions");


// ========================================
// GENERATE UNIQUE KYC REFERENCE
// ========================================

function generateKycReference(service) {
  return `KYC-${service.toUpperCase()}-${Date.now()}-${Math.floor(
    Math.random() * 10000
  )}`;
}


// ========================================
// CREATE KYC TRANSACTION
// ========================================

async function createKycTransaction({
  reference,
  userId,
  service,
  serviceName,
  amountKobo,
  providerCostKobo,
  profitKobo,
}) {
  await kycTransactionsCol()
    .doc(reference)
    .set({
      reference,
      userId,

      service,
      serviceName,

      // Customer price
      amount_kobo: amountKobo,
      amount_naira: koboToNaira(amountKobo),

      // TechHub provider cost
      provider_cost_kobo: providerCostKobo,
      provider_cost_naira: koboToNaira(
        providerCostKobo
      ),

      // BK9JA profit
      profit_kobo: profitKobo,
      profit_naira: koboToNaira(profitKobo),

      status: "pending",

      provider: "techhub",

      createdAt:
        admin.firestore.FieldValue.serverTimestamp(),

      updatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
    });

  return reference;
}


// ========================================
// UPDATE KYC TRANSACTION
// ========================================

async function updateKycTransaction(
  reference,
  updates
) {
  await kycTransactionsCol()
    .doc(reference)
    .update({
      ...updates,

      updatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
    });
}


// ========================================
// EXECUTE PAID KYC SERVICE
// ========================================

/**
 * Flow:
 *
 * 1. Get current pricing
 * 2. Check service is active
 * 3. Get customer price
 * 4. Get TechHub cost
 * 5. Calculate profit
 * 6. Generate reference
 * 7. Debit customer wallet
 * 8. Create KYC transaction
 * 9. Call TechHub
 * 10. Success -> mark successful
 * 11. Failure -> refund customer
 */

async function executeKyc({
  userId,
  service,
  techhubRequest,
}) {

  // ========================================
  // 1. GET CURRENT KYC PRICING
  // ========================================

const pricing = await getKycService(service);

console.log("========================================");
console.log("KYC SERVICE REQUEST:", service);
console.log("KYC PRICING FROM FIRESTORE:", pricing);
console.log("KYC isActive VALUE:", pricing?.isActive);
console.log("KYC isActive TYPE:", typeof pricing?.isActive);
console.log("========================================");
  if (!pricing) {
    const error = new Error(
      `KYC service "${service}" not found`
    );

    error.code =
      "KYC_SERVICE_NOT_FOUND";

    throw error;
  }


  // ========================================
  // 2. CHECK SERVICE ACTIVE
  // ========================================

  if (pricing.isActive !== true) {
    const error = new Error(
      `${pricing.name} is currently unavailable`
    );

    error.code =
      "KYC_SERVICE_INACTIVE";

    throw error;
  }


  // ========================================
  // 3. CUSTOMER PRICE
  // ========================================

  const userPrice =
    Number(pricing.userPrice);


  // ========================================
  // 4. TECHHUB PROVIDER COST
  // ========================================

  const providerCost =
    Number(pricing.providerCost);


  // ========================================
  // 5. VALIDATE CUSTOMER PRICE
  // ========================================

  if (
    !Number.isFinite(userPrice) ||
    userPrice <= 0
  ) {
    const error = new Error(
      "Invalid KYC service price"
    );

    error.code =
      "INVALID_KYC_PRICE";

    throw error;
  }


  // ========================================
  // 6. VALIDATE TECHHUB COST
  // ========================================

  if (
    !Number.isFinite(providerCost) ||
    providerCost < 0
  ) {
    const error = new Error(
      "Invalid TechHub service cost"
    );

    error.code =
      "INVALID_PROVIDER_COST";

    throw error;
  }


  // ========================================
  // 7. CHECK PRICE VS PROVIDER COST
  // ========================================

  if (userPrice < providerCost) {
    const error = new Error(
      "Customer price cannot be lower than TechHub provider cost"
    );

    error.code =
      "INVALID_PROFIT_MARGIN";

    throw error;
  }


  // ========================================
  // 8. CONVERT TO KOBO
  // ========================================

  const amountKobo =
    nairaToKobo(userPrice);

  const providerCostKobo =
    nairaToKobo(providerCost);


  // ========================================
  // 9. CALCULATE PROFIT
  // ========================================

  const profitKobo =
    amountKobo - providerCostKobo;


  // ========================================
  // 10. GENERATE REFERENCE
  // ========================================

  const reference =
    generateKycReference(service);


  // ========================================
  // 11. DEBIT CUSTOMER WALLET
  // ========================================

  const debitResult =
    await debitWallet(
      userId,
      `KYC-DEBIT-${reference}`,
      amountKobo,
      {
        type: "kyc",

        service,

        serviceName:
          pricing.name,

        kycReference:
          reference,

        provider:
          "techhub",

        amount_naira:
          userPrice,

        provider_cost_naira:
          providerCost,

        profit_naira:
          koboToNaira(profitKobo),
      }
    );


  // ========================================
  // 12. CHECK DEBIT RESULT
  // ========================================

  if (!debitResult.success) {

    const error = new Error(
      debitResult.reason ===
      "insufficient_funds"
        ? "Insufficient wallet balance"
        : "Unable to debit wallet"
    );

    error.code =
      debitResult.reason ===
      "insufficient_funds"
        ? "INSUFFICIENT_FUNDS"
        : "WALLET_DEBIT_FAILED";

    error.currentBalanceKobo =
      debitResult.current || 0;

    throw error;
  }


  // ========================================
  // 13. CREATE KYC TRANSACTION
  // ========================================

  await createKycTransaction({
    reference,

    userId,

    service,

    serviceName:
      pricing.name,

    amountKobo,

    providerCostKobo,

    profitKobo,
  });


  // ========================================
  // 14. CALL TECHHUB
  // ========================================

  try {

    const result =
      await techhubRequest();


    // ======================================
// 15. MARK SUCCESSFUL
// ======================================

// Remove the large PDF from the copy saved in Firestore.
// Keep the original `result` untouched so Flutter still receives
// the PDF in `data`.
const providerResponseForFirestore = {
  status: result?.status ?? null,
  response_code: result?.response_code ?? null,
  message: result?.message ?? null,
};
if (result?.user_data) {
  providerResponseForFirestore.user_data = {
    first_name: result.user_data.first_name ?? null,
    last_name: result.user_data.last_name ?? null,
    middle_name: result.user_data.middle_name ?? null,
    gender: result.user_data.gender ?? null,
    date_of_birth: result.user_data.date_of_birth ?? null,
    phone_number: result.user_data.phone_number ?? null,
    address: result.user_data.address ?? null,
  };
}
await updateKycTransaction(
  reference,
  {
    status: "success",

    provider: "techhub",

    provider_response:
      providerResponseForFirestore,

    completedAt:
      admin.firestore.FieldValue
        .serverTimestamp(),
  }
); 
   // ======================================
    // 16. RETURN RESULT
    // ======================================

    return {
      success: true,

      reference,

      service,

      serviceName:
        pricing.name,

      amount_naira:
        userPrice,

      provider:
        "techhub",

      provider_cost_naira:
        providerCost,

      profit_naira:
        koboToNaira(profitKobo),

      data:
        result,
    };

  } catch (error) {

    // ======================================
    // TECHHUB ERROR
    // ======================================

    console.error(
      `TechHub ${service} error:`,
      error.response?.data ||
        error.message
    );


    // ======================================
    // MARK FAILED
    // ======================================

    await updateKycTransaction(
      reference,
      {
        status: "failed",

        provider:
          "techhub",

        error:
          error.response?.data ||
          error.message,
      }
    );


    // ======================================
    // REFUND CUSTOMER
    // ======================================

    const refundReference =
      `KYC-REFUND-${reference}`;


    try {

      await creditWalletIdempotent(
        userId,

        refundReference,

        amountKobo,

        {
          type:
            "kyc_refund",

          service,

          serviceName:
            pricing.name,

          kycReference:
            reference,

          provider:
            "techhub",

          reason:
            "TechHub verification failed",
        }
      );


      // ====================================
      // MARK REFUNDED
      // ====================================

      await updateKycTransaction(
        reference,
        {
          status:
            "refunded",

          refund_reference:
            refundReference,

          refunded_amount_kobo:
            amountKobo,

          refunded_amount_naira:
            userPrice,

          refundedAt:
            admin.firestore.FieldValue
              .serverTimestamp(),
        }
      );

    } catch (refundError) {

      // ====================================
      // REFUND FAILED
      // ====================================

      console.error(
        "KYC REFUND FAILED:",
        refundError.message
      );


      await updateKycTransaction(
        reference,
        {
          status:
            "refund_failed",

          refund_error:
            refundError.message,
        }
      );
    }


    // ======================================
    // RE-THROW ORIGINAL TECHHUB ERROR
    // ======================================

    throw error;
  }
}

// ========================================
// EXPORT
// ========================================

module.exports = {
  executeKyc,
};