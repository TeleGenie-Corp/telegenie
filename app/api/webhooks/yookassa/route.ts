import { NextRequest, NextResponse } from 'next/server';
import { YooKassaService } from '@/services/yooKassaService';
import { BillingService } from '@/services/billingService';

// To verify webhook source if needed (optional for start)
const WHITELISTED_IPS = [
  '185.71.76.0/27',
  '185.71.77.0/27', 
  '77.75.153.0/25',
  '77.75.154.128/25', 
  '2a02:5180::/32' 
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body.event;

    console.log('[YooKassa Webhook]', event, body.object?.id);

    if (event === 'payment.succeeded') {
      const payment = body.object;
      const metadata = payment.metadata || {};
      const userId = metadata.userId;
      const planId = metadata.planId;
      
      if (userId && planId) {
        // Activate subscription via BillingService
        // We need to pass payment_method_id if it was saved
        const paymentMethodId = payment.payment_method?.saved ? payment.payment_method.id : undefined;

        await BillingService.processPaymentSuccess(userId, planId, paymentMethodId);
        console.log(`[YooKassa Webhook] Subscription activated for user ${userId}, plan ${planId}`);
      }
    }

    if (event === 'payment.canceled') {
        console.log('[YooKassa Webhook] Payment canceled', body.object.id);
    }

    if (event === 'payment_method.active') {
        console.log('[YooKassa Webhook] Payment method activated/saved', body.object.id);
    }
    
    return NextResponse.json({ status: 'ok' });
  } catch (e) {
    console.error('[YooKassa Webhook] Error:', e);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
