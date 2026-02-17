'use server';

import { adminDb } from '@/src/lib/firebaseAdmin';
import { YooKassaService } from '@/services/yooKassaService';
import { SubscriptionTier } from '@/types';

interface CreatePaymentResult {
  confirmationUrl?: string;
  error?: string;
}

const PLANS = [
  { id: 'free', price: 0, name: 'Starter' },
  { id: 'pro', price: 490, name: 'Expert' },
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
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.telegenie.ru'}/settings?payment=success`;

    const payment = await YooKassaService.createPayment({
      amount,
      description,
      returnUrl,
      email,
      metadata: {
        userId,
        planId
      },
      savePaymentMethod: true // Important for recurrence
    });

    if (payment.confirmation?.confirmation_url) {
        return { confirmationUrl: payment.confirmation.confirmation_url };
    }

    return { error: 'Payment initialization failed (no confirmation URL)' };

  } catch (error: any) {
    console.error('CreatePaymentAction Error:', error);
    return { error: error.message || 'Payment creation failed' };
  }
}
