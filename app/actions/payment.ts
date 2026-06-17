'use server';

import { adminDb } from '@/src/lib/firebaseAdmin';
import { adminAuth } from '@/src/lib/firebaseAdmin';
import { YooKassaService } from '@/services/yooKassaService';
import { SubscriptionActivationService } from '@/services/subscriptionActivationService';

interface CreatePaymentResult {
  confirmationUrl?: string;
  confirmationToken?: string;
  paymentId?: string;
  error?: string;
}

const PLANS = [
  { id: 'free', price: 0, name: 'Starter' },
  { id: 'expert', price: 490, name: 'Expert' },
  { id: 'monster', price: 2490, name: 'Monster Blogger' }
];

async function requireUserId(idToken: string): Promise<string> {
  if (!idToken) throw new Error('AUTH_REQUIRED');
  const decoded = await adminAuth.verifyIdToken(idToken);
  return decoded.uid;
}

function calculateUpgradeAmount(currentSubscription: any, currentPlan: typeof PLANS[number] | undefined, nextPlan: typeof PLANS[number]): number {
  if (!currentPlan || nextPlan.price <= currentPlan.price) return nextPlan.price;
  if (currentSubscription?.status !== 'active' || !currentSubscription.currentPeriodEnd) return nextPlan.price;

  const now = Date.now();
  if (currentSubscription.currentPeriodEnd <= now) return nextPlan.price;

  const remainingDays = (currentSubscription.currentPeriodEnd - now) / (1000 * 60 * 60 * 24);
  const remainingValue = (currentPlan.price / 30) * remainingDays;
  return Math.max(0, Math.floor(nextPlan.price - remainingValue));
}

export async function createPaymentAction(idToken: string, planId: string): Promise<CreatePaymentResult> {
  try {
    const userId = await requireUserId(idToken);

    // 1. Fetch user from Firestore (Admin)
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return { error: 'User not found' };
    }

    const userData = userDoc.data();
    const email = userData?.email || 'user@telegenie.ai'; // Fallback for testing

    // 2. Find Plan
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return { error: 'Plan not found' };
    if (plan.id === 'free') return { error: 'Free plan does not require payment' };

    // 3. Create Payment via YooKassa API (Server-side)
    const currentTier = userData?.subscription?.tier || 'free';
    const currentPlan = PLANS.find(p => p.id === currentTier);
    const amount = calculateUpgradeAmount(userData?.subscription, currentPlan, plan);
    if (amount <= 0) return { error: 'Payment amount must be positive' };

    const description = `Подписка на тариф ${plan.name} (TeleGenie)`;
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.telegenie.ru'}/?payment_status=success`;

    const payment = await YooKassaService.createPayment({
      amount,
      description,
      returnUrl,
      email,
      metadata: {
        userId,
        planId
      },
      savePaymentMethod: true, // Important for recurrence
      confirmationType: 'embedded'
    });

    if (payment.confirmation?.confirmation_token) {
        return { 
            confirmationToken: payment.confirmation.confirmation_token,
            paymentId: payment.id 
        };
    }

    if (payment.confirmation?.confirmation_url) {
        return { 
            confirmationUrl: payment.confirmation.confirmation_url,
            paymentId: payment.id 
        };
    }

    return { error: 'Payment initialization failed (no confirmation token/url)' };

  } catch (error: any) {
    console.error('CreatePaymentAction Error:', error);
    return { error: error.message || 'Payment creation failed' };
  }
}

export async function verifyPaymentAction(idToken: string, paymentId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const userId = await requireUserId(idToken);
        const payment = await YooKassaService.getPayment(paymentId);
        
        if (payment.status === 'succeeded' && payment.paid !== false) {
            // Verify Metadata
            const paymentUserId = payment.metadata?.userId;
            const planId = payment.metadata?.planId;
            
            if (!paymentUserId || !planId) {
                return { success: false, error: 'Invalid payment metadata' };
            }

            if (paymentUserId !== userId) {
                return { success: false, error: 'Payment does not belong to current user' };
            }
            
            // Get Plan Details
            const plan = PLANS.find(p => p.id === planId);
            if (!plan) return { success: false, error: 'Unknown plan' };

            await SubscriptionActivationService.activateFromPayment(payment);

            return { success: true };
        } else {
             return { success: false, error: `Payment status: ${payment.status}` };
        }
        
    } catch (error: any) {
        console.error('VerifyPaymentAction Error:', error);
        return { success: false, error: error.message || 'Verification failed' };
    }
}

export async function cancelSubscriptionAction(idToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireUserId(idToken);
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    // Update Firestore to disable auto-renewal and clear any scheduled changes
    await userRef.update({
      'subscription.autoRenew': false,
      'subscription.nextPlanId': null
    });

    return { success: true };

  } catch (error: any) {
    console.error('CancelSubscriptionAction Error:', error);
    return { success: false, error: error.message || 'Cancellation failed' };
  }
}

export async function scheduleSubscriptionChangeAction(idToken: string, newPlanId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireUserId(idToken);
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    // Validate Plan
    const plan = PLANS.find(p => p.id === newPlanId);
    if (!plan) return { success: false, error: 'Invalid plan' };

    // Update Firestore to schedule change
    await userRef.update({
      'subscription.nextPlanId': newPlanId,
      'subscription.autoRenew': true // Ensure auto-renew is on so scheduler picks it up
    });

    return { success: true };

  } catch (error: any) {
    console.error('ScheduleSubscriptionChangeAction Error:', error);
    return { success: false, error: error.message || 'Scheduling failed' };
  }
}

export async function unbindCardAction(idToken: string): Promise<{ success: boolean; error?: string }> {
    try {
        const userId = await requireUserId(idToken);
        const userRef = adminDb.collection('users').doc(userId);
        
        await userRef.update({
            'subscription.yookassaPaymentMethodId': null,
            'subscription.cardLast4': null,
            'subscription.cardType': null
        });
        
        return { success: true };
    } catch (error: any) {
        console.error('UnbindCardAction Error:', error);
        return { success: false, error: error.message || 'Failed to unbind card' };
    }
}
