import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

admin.initializeApp();
const db = admin.firestore();

// Types for CloudPayments Request
interface CPRequest {
  TransactionId: number;
  Amount: number;
  Currency: string;
  PaymentAmount?: number;
  OperationType: string;
  invoiceId?: string;
  AccountId: string; // userId in our system
  SubscriptionId?: string;
  Token?: string;
  Status: string; // 'Completed', 'Authorized', 'Declined'
  Data?: string | any; // Can be JSON string or object
}

export const cloudPaymentsWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // 1. Security: HMAC Validation
    const signature = req.headers['content-hmac'] as string;
    // Get secret from config: firebase functions:config:set cloudpayments.api_secret="YOUR_SECRET"
    const secret = functions.config().cloudpayments?.api_secret;

    if (!secret) {
      console.error('Missing cloudpayments.api_secret configuration');
      // Respond 200 to stop retries if misconfigured (or 500 to alert)
      // We will assume dev environment might miss it, log error.
    } else if (signature) {
      const hmac = crypto.createHmac('sha256', secret);
      // Firebase standard rawBody buffer
      hmac.update(req.rawBody);
      const digest = hmac.digest('base64');
      
      if (digest !== signature) {
        console.warn('Invalid HMAC signature', { expected: signature, got: digest });
        res.status(401).send('Invalid signature');
        return;
      }
    }

    // 2. Parse Payload
    const body = req.body as CPRequest;
    console.log('Received CloudPayments webhook:', JSON.stringify(body));

    const userId = body.AccountId;
    const status = body.Status;
    
    // Parse 'Data' which might contain planId
    let planId = 'pro'; // Default fallback
    try {
        const dataParsed = typeof body.Data === 'string' ? JSON.parse(body.Data) : body.Data;
        if (dataParsed?.planId) planId = dataParsed.planId;
    } catch (e) {
        console.warn('Failed to parse Data field', e);
    }

    if (!userId) {
       console.error('No AccountId (userId) in request');
       res.json({ code: 0 });
       return;
    }

    // 3. Handle Status
    if (status === 'Completed' || status === 'Authorized') {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        // Subscription Logic
        const now = Date.now();
        const periodDays = 30;
        let additionalTime = 0;

        // Proration: Check if upgrading early
        if (userData?.subscription?.status === 'active' && userData.subscription.currentPeriodEnd > now) {
             const oldTier = userData.subscription.tier;
             // Simple logic: if switching Pro -> Monster, current time is devalued but added.
             // Actually, simplest fair way: Just Add 30 Days to NOW, ignoring old overlap?
             // Or Add 30 Days to CurrentEnd?
             // If we add to CurrentEnd, we give them "Double Subscription" time for the price of one.
             // Correct 'Upgrade' logic: START NEW PERIOD NOW. Credit remaining value?
             // If we assume the user just paid Full Price, we just start fresh.
             // To be generous/easy: We just add 30 days to NOW.
             // Old time is lost/overwritten. (MVP Approach).
             // Refined: If we want to support "Pay Difference" in future, we need complex math.
             // For now: Clean slate.
        }

        const currentPeriodEnd = now + (periodDays * 24 * 60 * 60 * 1000);

        await userRef.set({
            subscription: {
                tier: planId,
                status: 'active',
                currentPeriodEnd: currentPeriodEnd,
                autoRenew: true,
                updatedAt: now,
                subscriptionId: body.SubscriptionId || userData?.subscription?.subscriptionId // Persist ID
            },
            usage: {
                // Reset limit on new payment
                postsThisMonth: 0,
                tokensThisMonth: 0,
                lastReset: now
            }
        }, { merge: true });

        console.log(`Subscription updated for user ${userId} to plan ${planId}`);
    } else if (status === 'Declined') {
        console.log(`Payment declined for user ${userId}`);
        // Optional: Notify user
    } else if (status === 'Cancelled') {
         // Handle manual cancellation logic if needed
    }

    res.json({ code: 0 });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.json({ code: 0 });
  }
});

// Callable function to cancel subscription
export const cancelSubscription = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const userId = context.auth.uid;
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();
    const sub = doc.data()?.subscription;

    if (!sub || !sub.subscriptionId) {
         // Just mark local as canceled if no remote ID
         await userRef.update({ 'subscription.autoRenew': false });
         return { success: true, message: 'Local subscription canceled' };
    }

    const secret = functions.config().cloudpayments?.api_secret;
    if (!secret) throw new functions.https.HttpsError('failed-precondition', 'API Secret missing');

    try {
        // Use native fetch (Node 18+)
        const response = await fetch('https://api.cloudpayments.ru/subscriptions/cancel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(functions.config().cloudpayments.public_id + ':' + secret).toString('base64')
            },
            body: JSON.stringify({ Id: sub.subscriptionId })
        });
        
        const result = await response.json() as { Success: boolean; Message?: string };
        
        if (result.Success) {
            await userRef.update({ 'subscription.autoRenew': false });
            return { success: true };
        } else {
            console.error('CP Cancel Error', result);
            throw new functions.https.HttpsError('internal', 'CloudPayments error: ' + (result.Message || 'Unknown'));
        }
    } catch (e) {
        console.error("Cancel error", e);
        throw new functions.https.HttpsError('internal', 'Failed to cancel subscription');
    }
});
