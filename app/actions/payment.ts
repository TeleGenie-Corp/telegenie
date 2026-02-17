'use server';

import { adminDb } from '@/src/lib/firebaseAdmin';
import { YooKassaService } from '@/services/yooKassaService';
import { SubscriptionTier } from '@/types';

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

export async function createPaymentAction(userId: string, planId: string, customAmount?: number): Promise<CreatePaymentResult> {
  try {
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

    // 3. Create Payment via YooKassa API (Server-side)
    const amount = customAmount !== undefined ? customAmount : plan.price;
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
      confirmationType: 'redirect'
    });

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

export async function verifyPaymentAction(paymentId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const payment = await YooKassaService.getPayment(paymentId);
        
        if (payment.status === 'succeeded' || payment.status === 'waiting_for_capture') {
            // Verify Metadata
            const userId = payment.metadata?.userId;
            const planId = payment.metadata?.planId;
            
            if (!userId || !planId) {
                return { success: false, error: 'Invalid payment metadata' };
            }
            
            // Get Plan Details
            const plan = PLANS.find(p => p.id === planId);
            if (!plan) return { success: false, error: 'Unknown plan' };

            // Calculate Period
            const now = Date.now();
            const currentPeriodEnd = now + (30 * 24 * 60 * 60 * 1000); // 30 days
            
            // Update User Profile
            const userRef = adminDb.collection('users').doc(userId);
            
            const updateData: any = {
                'subscription.tier': planId,
                'subscription.status': 'active',
                'subscription.currentPeriodEnd': currentPeriodEnd,
                'subscription.autoRenew': true
            };
            
            // Save Payment Method for Recurrent Payments
            if (payment.payment_method?.saved && payment.payment_method?.id) {
                updateData['subscription.yookassaPaymentMethodId'] = payment.payment_method.id;
            }
            
            await userRef.update(updateData);
            
            return { success: true };
        } else {
             return { success: false, error: `Payment status: ${payment.status}` };
        }
        
    } catch (error: any) {
        console.error('VerifyPaymentAction Error:', error);
        return { success: false, error: error.message || 'Verification failed' };
    }
}

export async function cancelSubscriptionAction(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
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

export async function scheduleSubscriptionChangeAction(userId: string, newPlanId: string): Promise<{ success: boolean; error?: string }> {
  try {
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
