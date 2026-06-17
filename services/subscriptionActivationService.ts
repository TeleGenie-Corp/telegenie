import { adminDb } from '@/src/lib/firebaseAdmin';

export interface PaymentLike {
  id: string;
  status: string;
  paid?: boolean;
  amount?: { value?: string; currency?: string };
  payment_method?: {
    id?: string;
    saved?: boolean;
    card?: {
      last4?: string;
      card_type?: string;
    };
  };
  metadata?: Record<string, any>;
}

export class SubscriptionActivationService {
  static async activateFromPayment(payment: PaymentLike): Promise<{ activated: boolean; reason?: string }> {
    if (payment.status !== 'succeeded' || payment.paid === false) {
      return { activated: false, reason: `Payment status is ${payment.status}` };
    }

    const userId = payment.metadata?.userId;
    const planId = payment.metadata?.planId;

    if (!userId || !planId) {
      return { activated: false, reason: 'Missing payment metadata' };
    }

    const existing = await adminDb
      .collection('transactions')
      .where('paymentId', '==', payment.id)
      .limit(1)
      .get();

    if (!existing.empty) {
      return { activated: false, reason: 'Payment already processed' };
    }

    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return { activated: false, reason: 'User not found' };
    }

    const now = Date.now();
    const currentEnd = userDoc.data()?.subscription?.currentPeriodEnd || now;
    const newPeriodEnd = Math.max(currentEnd, now) + 30 * 24 * 60 * 60 * 1000;
    const updateData: any = {
      'subscription.tier': planId,
      'subscription.status': 'active',
      'subscription.currentPeriodEnd': newPeriodEnd,
      'subscription.autoRenew': true,
      'subscription.updatedAt': now,
    };

    if (payment.payment_method?.id) {
      updateData['subscription.yookassaPaymentMethodId'] = payment.payment_method.id;
      const card = payment.payment_method.card;
      if (card) {
        updateData['subscription.cardLast4'] = card.last4;
        updateData['subscription.cardType'] = card.card_type;
      }
    }

    await userRef.update(updateData);

    await adminDb.collection('transactions').add({
      userId,
      planId,
      amount: payment.amount?.value,
      currency: payment.amount?.currency || 'RUB',
      paymentId: payment.id,
      status: payment.status,
      type: 'subscription',
      createdAt: now,
    });

    return { activated: true };
  }
}
