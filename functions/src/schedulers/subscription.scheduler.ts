import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { YooKassaService } from '../services/yookassa.service';

const db = admin.firestore();

// Define Plans locally for Functions scope
const PLANS = [
  { id: 'free', price: 0, name: 'Starter' },
  { id: 'expert', price: 490, name: 'Expert' },
  { id: 'monster', price: 2490, name: 'Monster Blogger' }
];

export const checkSubscriptionRenewals = functions
  .runWith({ secrets: ['YOOKASSA_SHOP_ID', 'YOOKASSA_SECRET_KEY'] })
  .pubsub.schedule('0 0 * * *')
  .onRun(async (context: any) => {
    const now = Date.now();
    const today = new Date(now);

    console.log(`[Scheduler] Checking renewals for ${today.toISOString()}`);

    const snapshot = await db.collection('users')
      .where('subscription.autoRenew', '==', true)
      .where('subscription.status', '==', 'active')
      .where('subscription.currentPeriodEnd', '<=', now)
      .get();

    if (snapshot.empty) {
      console.log('[Scheduler] No subscriptions to renew.');
      return null;
    }

    console.log(`[Scheduler] Found ${snapshot.size} subscriptions to renew.`);

    const promises = snapshot.docs.map(async (doc) => {
      const userData = doc.data();
      const userId = doc.id;
      const sub = userData.subscription;

      if (!sub || !sub.yookassaPaymentMethodId) {
        console.warn(`[Scheduler] User ${userId} has no payment method for renewal.`);
        await doc.ref.update({ 'subscription.status': 'canceled', 'subscription.autoRenew': false });
        return;
      }

      const nextPlanId = sub.nextPlanId;
      const targetPlanId = nextPlanId || sub.tier;
      const plan = PLANS.find(p => p.id === targetPlanId);

      if (!plan || plan.price === 0) {
        console.log(`[Scheduler] User ${userId} target plan is free or invalid, skipping charge.`);
        if (nextPlanId === 'free') {
          await doc.ref.update({
            'subscription.tier': 'free',
            'subscription.status': 'active',
            'subscription.autoRenew': false,
            'subscription.nextPlanId': admin.firestore.FieldValue.delete()
          });
        }
        return;
      }

      try {
        console.log(`[Scheduler] Attempting charge for user ${userId}, plan ${plan.name} (${plan.price} RUB)`);

        const payment = await YooKassaService.createRecurringPayment({
          amount: plan.price,
          description: `Продление подписки ${plan.name} (TeleGenie)`,
          paymentMethodId: sub.yookassaPaymentMethodId,
          email: userData.email,
          metadata: { userId, planId: plan.id, type: 'renewal' }
        });

        if (payment.status === 'succeeded' || payment.status === 'waiting_for_capture') {
          console.log(`[Scheduler] Renewal successful for ${userId}. Payment: ${payment.id}`);

          const newPeriodEnd = Date.now() + (30 * 24 * 60 * 60 * 1000);
          const updateData: any = {
            'subscription.status': 'active',
            'subscription.currentPeriodEnd': newPeriodEnd,
            'subscription.lastPaymentId': payment.id
          };

          if (nextPlanId) {
            updateData['subscription.tier'] = nextPlanId;
            updateData['subscription.nextPlanId'] = admin.firestore.FieldValue.delete();
          }

          await doc.ref.update(updateData);
        } else {
          console.warn(`[Scheduler] Payment not succeeded immediately for ${userId}: ${payment.status}`);
          if (payment.status === 'canceled') {
            await doc.ref.update({ 'subscription.status': 'canceled', 'subscription.autoRenew': false });
          }
        }
      } catch (error) {
        console.error(`[Scheduler] Failed to renew for ${userId}`, error);
      }
    });

    await Promise.all(promises);
    return null;
  });
