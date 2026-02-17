import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { YooKassaService } from '../services/yookassa.service';

const db = admin.firestore();

// Define Plans locally for Functions scope
const PLANS = [
  { id: 'free', price: 0, name: 'Starter' },
  { id: 'expert', price: 490, name: 'Expert' },
  { id: 'monster', price: 2490, name: 'Monster Blogger' }
];

export const checkSubscriptionRenewals = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    const now = Date.now();
    const today = new Date(now);
    
    console.log(`[Scheduler] Checking renewals for ${today.toISOString()}`);

    // Query active subscriptions that are auto-renewable and expired (or expiring today)
    // Note: In a real large-scale app, we might need a composite index on [autoRenew, currentPeriodEnd]
    const snapshot = await db.collection('users')
        .where('subscription.autoRenew', '==', true)
        .where('subscription.status', '==', 'active')
        .where('subscription.currentPeriodEnd', '<=', now) // Expired or expiring
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
            // Optionally set status to past_due or canceled
            await doc.ref.update({ 'subscription.status': 'canceled', 'subscription.autoRenew': false });
            return;
        }

        // Check for scheduled plan change
        const nextPlanId = sub.nextPlanId;
        const targetPlanId = nextPlanId || sub.tier;
        
        const plan = PLANS.find(p => p.id === targetPlanId);
        
        // If next plan is free, we should have probably just canceled, but let's handle it safely
        if (!plan || plan.price === 0) {
             console.log(`[Scheduler] User ${userId} target plan is free or invalid, skipping charge.`);
             // If it was a scheduled downgrade to free? (Usually handled by cancelSubscriptionAction setting autoRenew=false)
             if (nextPlanId === 'free') {
                 await doc.ref.update({ 
                     'subscription.tier': 'free', 
                     'subscription.status': 'active', // effectively free
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
                metadata: {
                    userId,
                    planId: plan.id,
                    type: 'renewal'
                }
            });

            if (payment.status === 'succeeded' || payment.status === 'waiting_for_capture') {
                 console.log(`[Scheduler] Renewal successful for ${userId}. Payment: ${payment.id}`);
                 
                 // Extend for 30 days
                 const newPeriodEnd =  Date.now() + (30 * 24 * 60 * 60 * 1000);
                 
                 const updateData: any = {
                     'subscription.status': 'active',
                     'subscription.currentPeriodEnd': newPeriodEnd,
                     'subscription.lastPaymentId': payment.id
                 };

                 // Apply plan change if scheduled
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
