// utils/fees.js

const PAYSTACK_FEE_PERCENT = 1.5; // %
const MY_FEE_PERCENT = 2;      // %

const nairaToKobo = (amount) => Math.round(amount * 100);
const koboToNaira = (amount) => amount / 100;

/**
 * Calculate fees and final credited amount
 * @param {number} amountKobo - Amount in Kobo
 * @returns {object} fees breakdown
 */
function calculateFees(amountKobo) {
  const paystackFeeKobo = Math.round((PAYSTACK_FEE_PERCENT / 100) * amountKobo);
  const myFeeKobo = Math.round((MY_FEE_PERCENT / 100) * amountKobo);
  const totalFeeKobo = paystackFeeKobo + myFeeKobo;
  const creditedKobo = amountKobo - totalFeeKobo;

  return {
    original_kobo: amountKobo,
    paystack_fee_kobo: paystackFeeKobo,
    my_fee_kobo: myFeeKobo,
    total_fee_kobo: totalFeeKobo,
    credited_kobo: creditedKobo,
    credited_naira: koboToNaira(creditedKobo),
  };
}

module.exports = {
  calculateFees,
  nairaToKobo,
  koboToNaira,
};