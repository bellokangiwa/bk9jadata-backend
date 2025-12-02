// controllers/walletController.js
const axios = require("axios");
const admin = require("firebase-admin");
const crypto = require("crypto");

const db = admin.firestore();

// Environment
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = process.env.PAYSTACK_BASE || 'https://api.paystack.co';
const paystackPrefix = process.env.PAYSTACK_PREFIX || 'BK9JA-WALLET-';

// Collections
const walletsCol = () => db.collection('wallets');
const txCol = () => db.collection('wallet_transactions');

// ===== Helpers =====
function nairaToKobo(naira) {
  return Math.round(Number(naira) * 100);
}
function koboToNaira(kobo) {
  return Number(kobo) / 100;
}
async function recordWalletTx(txDocId, payload) {
  return txCol().doc(txDocId).set({
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...payload
  }, { merge: true });
}

// idempotent credit using Firestore transaction
async function creditWalletIdempotent(userId, txDocId, amount_kobo, meta = {}) {
  const txRef = txCol().doc(txDocId);
  const txSnap = await txRef.get();
  if (txSnap.exists && txSnap.data().processed === true) {
    return { processed: false, reason: 'already_processed' };
  }

  await db.runTransaction(async t => {
    const walletRef = walletsCol().doc(userId);
    const walletSnap = await t.get(walletRef);

    if (!walletSnap.exists) {
      t.set(walletRef, { balance_kobo: amount_kobo });
    } else {
      const prev = walletSnap.data().balance_kobo || 0;
      t.update(walletRef, { balance_kobo: prev + amount_kobo });
    }

    t.set(txRef, {
      processed: true,
      userId,
      amount_kobo,
      type: 'credit',
      meta
    }, { merge: true });
  });

  return { processed: true };
}

// debit safely with Firestore transaction
async function debitWallet(userId, txDocId, amount_kobo, meta = {}) {
  const txRef = txCol().doc(txDocId);
  const txSnap = await txRef.get();
  if (txSnap.exists && txSnap.data().processed === true) {
    return { success: false, reason: 'already_processed' };
  }

  const result = await db.runTransaction(async t => {
    const walletRef = walletsCol().doc(userId);
    const walletSnap = await t.get(walletRef);
    const current = (walletSnap.exists && walletSnap.data().balance_kobo) ? walletSnap.data().balance_kobo : 0;

    if (current < amount_kobo) {
      return { success: false, reason: 'insufficient_funds', current };
    }

    t.update(walletRef, { balance_kobo: current - amount_kobo });
    t.set(txRef, {
      processed: true,
      userId,
      amount_kobo,
      type: 'debit',
      meta
    }, { merge: true });

    return { success: true, remaining: current - amount_kobo };
  });

  return result;
}

// ====== Controllers / Endpoints ======

// GET /wallet/balance/:userId    (public or protected as you choose)
exports.getBalance = async (req, res) => {
  try {
    const userId = req.params.userId;
    const snap = await walletsCol().doc(userId).get();
    if (!snap.exists) return res.status(404).json({ status: false, message: "Wallet not found" });
    const data = snap.data();
    return res.json({ status: true, balance_kobo: data.balance_kobo || 0, balance_naira: koboToNaira(data.balance_kobo || 0) });
  } catch (err) {
    console.error("balance error", err.message);
    return res.status(500).json({ status: false, error: err.message });
  }
};

// POST /wallet/fund  (protected) -> initialize Paystack transaction
exports.initiateFund = async (req, res) => {
  try {
    const uid = req.auth && req.auth.uid;
    if (!uid) return res.status(401).json({ error: "Not authenticated" });

    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: "amount required" });

    const amount_kobo = nairaToKobo(amount);
    const reference = `${paystackPrefix}${Date.now()}`;

    const initBody = {
      email: `${uid}@bk9ja.internal`,
      amount: amount_kobo,
      reference,
      metadata: { userId: uid, purpose: 'wallet_fund' }
    };

    const resp = await axios.post(`${PAYSTACK_BASE}/transaction/initialize`, initBody, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' }
    });

    await recordWalletTx(reference, {
      reference,
      userId: uid,
      amount_kobo,
      type: 'fund_init',
      paystack_init: resp.data,
      processed: false
    });

    return res.json({ status: true, data: resp.data });
  } catch (err) {
    console.error('fund init error', err.response ? err.response.data : err.message);
    return res.status(500).json({ status: false, error: err.response ? err.response.data : err.message });
  }
};

// GET /wallet/verify/:reference  (public) - verifies Paystack transaction and credits
exports.verifyFund = async (req, res) => {
  try {
    const reference = req.params.reference;
    const resp = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
    });

    await recordWalletTx(reference, { paystack_verify: resp.data });

    if (resp.data?.data?.status === 'success') {
      const amount_kobo = resp.data.data.amount;
      const userId = resp.data.data.metadata?.userId || resp.data.data.customer?.email || null;
      const meta = { paystack: resp.data.data };

      const creditResult = await creditWalletIdempotent(userId, reference, amount_kobo, meta);

      return res.json({ verified: true, creditResult, data: resp.data });
    }

    return res.json({ verified: false, data: resp.data });
  } catch (err) {
    console.error('verify error', err.response ? err.response.data : err.message);
    return res.status(500).json({ status: false, error: err.response ? err.response.data : err.message });
  }
};

// POST /webhook (raw body) - Paystack webhook handling
// inside controllers/walletController.js — replace webhookHandler with this
// helper: find userId by DVA account number saved in wallets/{userId}.dva.account_number
async function findUserIdByAccountNumber(accountNumber) {
  if (!accountNumber) return null;
  const q = await db.collection('wallets').where('dva.account_number', '==', accountNumber).limit(1).get();
  if (q.empty) return null;
  return q.docs[0].id;
}

exports.webhookHandler = async (req, res) => {
  // Paystack signs the raw body — we expect bodyParser.raw at the route
  const signature = req.headers['x-paystack-signature'] || '';
  const raw = req.body; // Buffer
  const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(raw).digest('hex');

  if (!PAYSTACK_SECRET) console.warn('PAYSTACK_SECRET not set');
  if (hash !== signature) {
    console.warn('Invalid webhook signature');
    return res.status(400).send('Invalid signature');
  }

  let event;
  try {
    event = JSON.parse(raw.toString());
  } catch (e) {
    console.warn('Bad webhook JSON', e.message);
    return res.status(400).send('Bad payload');
  }

  try {
    // We handle charge.success events (payment succeeded) which includes DVA payments
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const amount_kobo = event.data.amount;
      // Try metadata first (if the payer used a Paystack checkout that passed metadata)
      let userId = event.data.metadata?.userId || null;

      // If metadata missing, try to identify by DVA account number fields commonly present:
      // Paystack may include account_number under event.data or event.data.recipient or event.data.customer_account
      if (!userId) {
        const possibleAccountFields = [
          event.data?.account_number,
          event.data?.recipient,
          event.data?.recipient_account,
          event.data?.display_account,
          event.data?.customer?.account_number,
          event.data?.recipient?.account_number
        ];
        const acct = possibleAccountFields.find(Boolean);
        if (acct) {
          userId = await findUserIdByAccountNumber(String(acct));
        }
      }

      // record receipt (webhook raw)
      await recordWalletTx(reference, { webhook: event, processed: false });

      if (userId) {
        const creditResult = await creditWalletIdempotent(userId, reference, amount_kobo, { webhook: event, source: 'dva' });
        console.log('webhook credit result', creditResult);
      } else {
        console.warn('No userId mapped for DVA webhook reference', reference);
      }
    } else {
      // record for other events for auditing
      if (event.data?.reference) await recordWalletTx(event.data.reference, { webhook: event });
    }
  } catch (err) {
    console.error('webhook processing error', err.message);
  }

  return res.status(200).send('ok');
};
// POST /wallet/debit  (protected) - debit user's wallet amount_kobo from user
exports.debit = async (req, res) => {
  try {
    const uid = req.auth && req.auth.uid;
    if (!uid) return res.status(401).json({ error: "Not authenticated" });

    const { amount, reason } = req.body;
    if (!amount) return res.status(400).json({ error: "amount required" });

    const amount_kobo = nairaToKobo(amount);
    const txId = `DEBIT-${uid}-${Date.now()}`;

    const result = await debitWallet(uid, txId, amount_kobo, { reason });
    if (result.success) {
      await recordWalletTx(txId, { type: 'debit', userId: uid, amount_kobo, meta: { reason }, processed: true });
      return res.json({ status: true, message: 'debit successful', remaining_kobo: result.remaining, remaining_naira: koboToNaira(result.remaining) });
    } else {
      return res.status(400).json({ status: false, reason: result.reason, current_balance_kobo: result.current || null });
    }
  } catch (err) {
    console.error('debit error', err.message);
    return res.status(500).json({ status: false, error: err.message });
  }
};

// GET /wallet/history/:userId
exports.history = async (req, res) => {
  try {
    const userId = req.params.userId;
    const limit = parseInt(req.query.limit || '50', 10);
    const snapshot = await txCol()
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const items = [];
    snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));

    return res.json({ status: true, count: items.length, items });
  } catch (err) {
    console.error('history error', err.message);
    return res.status(500).json({ status: false, error: err.message });
  }
};
