import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/src/lib/firebaseAdmin';

// YooKassa IP whitelist (for future IP validation)
// const WHITELISTED_IPS = [
//   '185.71.76.0/27', '185.71.77.0/27',
//   '77.75.153.0/25', '77.75.154.128/25', '2a02:5180::/32'
// ];

async function activateSubscription(payment: any) {
  const metadata = payment.metadata || {};
  const userId = metadata.userId;
  const planId = metadata.planId;

  if (!userId || !planId) {
    console.warn('[Webhook] Missing userId or planId in metadata', metadata);
    return;
  }

  const userRef = adminDb.collection('users').doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return;

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

  // Save payment method if available
  if (payment.payment_method?.saved && payment.payment_method?.id) {
    updateData['subscription.yookassaPaymentMethodId'] = payment.payment_method.id;
    const card = (payment.payment_method as any).card;
    if (card) {
      updateData['subscription.cardLast4'] = card.last4;
      updateData['subscription.cardType'] = card.card_type;
    }
  }

  await userRef.update(updateData);

  // Log transaction
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

  console.log(`[Webhook] Subscription activated: user=${userId}, plan=${planId}`);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body.event as string;
    const object = body.object;

    console.log('[YooKassa Webhook]', event, object?.id);

    switch (event) {

      // ── Успешный платёж ────────────────────────────────────────────────
      case 'payment.succeeded': {
        await activateSubscription(object);
        break;
      }

      // ── Платёж ожидает захвата (двухстадийный, мы не используем) ──────
      // Если capture: true выставлен при создании, ЮKassa захватывает сама
      // и это событие обычно не приходит. На случай если придёт — активируем.
      case 'payment.waiting_for_capture': {
        await activateSubscription(object);
        break;
      }

      // ── Платёж отменён / отклонён ──────────────────────────────────────
      case 'payment.canceled': {
        const metadata = object.metadata || {};
        const userId = metadata.userId;
        if (!userId) break;

        const userRef = adminDb.collection('users').doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) break;

        const sub = userDoc.data()?.subscription;
        const now = Date.now();

        // Only downgrade if it was an active renewal that failed (not initial payment)
        // If sub doesn't exist or is already free — nothing to do
        if (sub?.status === 'active' && sub?.currentPeriodEnd > now) {
          // Subscription is still valid — it was a renewal attempt that failed.
          // Mark autoRenew = false so user knows they need to update payment method.
          await userRef.update({
            'subscription.autoRenew': false,
            'subscription.cancelReason': object.cancellation_details?.reason || 'unknown',
            'subscription.updatedAt': now,
          });
          console.log(`[Webhook] Renewal canceled for user ${userId}: ${object.cancellation_details?.reason}`);
        } else {
          // Initial payment failed — mark as inactive
          await userRef.update({
            'subscription.status': 'canceled',
            'subscription.autoRenew': false,
            'subscription.updatedAt': now,
          });
          console.log(`[Webhook] Payment canceled for user ${userId}, subscription deactivated`);
        }
        break;
      }

      // ── Метод оплаты активирован (привязка карты/СБП) ─────────────────
      case 'payment_method.active': {
        // object here is payment_method, not payment
        // This event fires when a payment method is saved after a payment.
        // The userId is in the payment's metadata, but this event doesn't include payment metadata.
        // We handle method saving during payment.succeeded, so just log here.
        console.log(`[Webhook] Payment method activated: ${object.id}, type: ${object.type}`);
        break;
      }

      // ── Возврат средств ────────────────────────────────────────────────
      case 'refund.succeeded': {
        const paymentId = object.payment_id;
        const now = Date.now();

        // Log the refund
        await adminDb.collection('transactions').add({
          paymentId,
          refundId: object.id,
          amount: object.amount?.value,
          currency: object.amount?.currency || 'RUB',
          status: 'refunded',
          type: 'refund',
          createdAt: now,
        });

        console.log(`[Webhook] Refund succeeded: refund=${object.id}, payment=${paymentId}`);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event: ${event}`);
    }

    return NextResponse.json({ status: 'ok' });

  } catch (e) {
    console.error('[YooKassa Webhook] Error:', e);
    // Always return 200 to YooKassa to prevent retries on our bugs
    return NextResponse.json({ status: 'error', message: 'Internal error' }, { status: 200 });
  }
}
