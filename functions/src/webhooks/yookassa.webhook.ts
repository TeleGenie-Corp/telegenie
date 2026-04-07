import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

const db = admin.firestore();

const PLANS = [
  { id: 'free', price: 0, name: 'Starter' },
  { id: 'expert', price: 490, name: 'Expert' },
  { id: 'monster', price: 2490, name: 'Monster Blogger' }
];

/**
 * Verify webhook is genuine by re-fetching the payment from YooKassa API.
 * YooKassa doesn't use HMAC — verification by re-fetch is their recommended approach.
 */
async function fetchPaymentFromYooKassa(paymentId: string): Promise<any> {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secretKey) throw new Error('YooKassa credentials missing');

  const auth = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
  const response = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
    headers: { 'Authorization': auth, 'Content-Type': 'application/json' }
  });

  if (!response.ok) throw new Error(`YooKassa API error: ${response.status}`);
  return response.json();
}

export const yookassaWebhook = functions
  .runWith({ secrets: ['YOOKASSA_SHOP_ID', 'YOOKASSA_SECRET_KEY'] })
  .https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const { event, object: eventObject } = req.body || {};

    if (!event || !eventObject?.id) {
      res.status(400).send('Invalid payload');
      return;
    }

    functions.logger.info(`[YooKassa Webhook] event=${event} paymentId=${eventObject.id}`);

    try {
      // Re-fetch from API to verify the event is genuine
      const payment = await fetchPaymentFromYooKassa(eventObject.id);

      if (event === 'payment.succeeded' && payment.status === 'succeeded') {
        await handlePaymentSucceeded(payment);
      } else if (event === 'payment.canceled' && payment.status === 'canceled') {
        await handlePaymentCanceled(payment);
      }
      // Other events (payment.waiting_for_capture, refund.succeeded) ignored for now

      res.status(200).send('OK');
    } catch (err: any) {
      functions.logger.error('[YooKassa Webhook] Error:', err);
      // Return 200 to prevent YooKassa from retrying on our logic errors
      res.status(200).send('OK');
    }
  });

async function handlePaymentSucceeded(payment: any) {
  const userId = payment.metadata?.userId;
  const planId = payment.metadata?.planId;
  const renewalType = payment.metadata?.type; // 'renewal' for scheduler-triggered

  if (!userId || !planId) {
    functions.logger.warn('[Webhook] payment.succeeded without userId/planId', payment.id);
    return;
  }

  const plan = PLANS.find(p => p.id === planId);
  if (!plan) {
    functions.logger.warn('[Webhook] Unknown planId:', planId);
    return;
  }

  const now = Date.now();
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    functions.logger.warn('[Webhook] User not found:', userId);
    return;
  }

  const currentSub = userDoc.data()?.subscription || {};

  // For renewals extend from current period end, not from now
  const baseTime = renewalType === 'renewal'
    ? Math.max(currentSub.currentPeriodEnd || now, now)
    : now;

  const updateData: any = {
    'subscription.tier': planId,
    'subscription.status': 'active',
    'subscription.currentPeriodEnd': baseTime + 30 * 24 * 60 * 60 * 1000,
    'subscription.autoRenew': true,
  };

  // Save payment method for future recurring charges
  if (payment.payment_method?.id) {
    updateData['subscription.yookassaPaymentMethodId'] = payment.payment_method.id;

    if (payment.payment_method.card) {
      updateData['subscription.cardLast4'] = payment.payment_method.card.last4;
      updateData['subscription.cardType'] = payment.payment_method.card.card_type;
    }
  }

  // Clear scheduled plan change if this was a renewal
  if (renewalType === 'renewal' && currentSub.nextPlanId) {
    updateData['subscription.nextPlanId'] = admin.firestore.FieldValue.delete();
  }

  await userRef.update(updateData);

  // Log transaction
  await db.collection('transactions').add({
    userId,
    planId,
    amount: payment.amount?.value,
    currency: payment.amount?.currency || 'RUB',
    paymentId: payment.id,
    paymentMethodId: payment.payment_method?.id,
    status: 'succeeded',
    type: renewalType === 'renewal' ? 'renewal' : 'subscription',
    createdAt: now,
  });

  functions.logger.info(`[Webhook] Subscription activated for ${userId}, plan=${planId}`);
}

async function handlePaymentCanceled(payment: any) {
  const userId = payment.metadata?.userId;
  if (!userId) return;

  // Only mark as canceled if this was a renewal attempt (not the initial payment)
  const renewalType = payment.metadata?.type;
  if (renewalType !== 'renewal') return;

  await db.collection('users').doc(userId).update({
    'subscription.status': 'canceled',
    'subscription.autoRenew': false,
  });

  functions.logger.warn(`[Webhook] Renewal payment canceled for ${userId}`);
}
