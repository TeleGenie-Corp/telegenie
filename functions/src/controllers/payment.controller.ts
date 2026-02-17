import { Request } from "firebase-functions/v2/https";
import * as express from "express";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { isValidSignature } from "../utils/crypto";

// type alias for Response
type Response = express.Response;

/*
interface CPModel {
    Id: number;
    AccountId: string;
    Amount: number;
    Currency: string;
    Email?: string;
    Description?: string;
    Data?: string | any; // Metadata
    Status?: string;
    Token?: string; // Recurrent token
}
*/

const API_SECRET = process.env.CLOUDPAYMENTS_API_SECRET || 'test_api_secret';

export const handleWebhook = async (req: Request, res: Response) => {
    if (!isValidSignature(req, API_SECRET)) {
         res.status(401).send('Invalid signature');
         return;
    }

    const { TransactionId, Amount, Currency, AccountId, Data, Token } = req.body;
    const type = req.query.type as string;

    const db = admin.firestore();
    const userRef = db.collection('users').doc(AccountId);

    try {
        if (type === 'check') {
            // Validate amount/user
            // Return { code: 0 } to allow
            const doc = await userRef.get();
            if(!doc.exists) {
                 res.json({ code: 13 }); // Reject
                 return;
            }
            res.json({ code: 0 });
            return;
        }
        
        if (type === 'pay' || type === 'recurrent') {
            // Payment success
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                logger.error(`User ${AccountId} not found for payment`);
                 res.json({ code: 0 }); // Accept money anyway? usually strict 0
                 return;
            }

            // Determine Plan
            // Data can be passed as JSON string in 'Data' field
            let planId = 'expert'; // Default
            try {
                const metadata = typeof Data === 'string' ? JSON.parse(Data) : Data;
                if (metadata?.planId) planId = metadata.planId;
            } catch (e) {}

            // Update User
            const subscription = {
                tier: planId,
                status: 'active',
                currentPeriodEnd: Date.now() + 32 * 24 * 60 * 60 * 1000, // +30 days + buffer
                autoRenew: true,
                recurrentToken: Token // Save for future cancellations
            };
            
            await userRef.update({
                subscription: subscription,
                // Add transaction log
                [`transactions.${TransactionId}`]: {
                    id: TransactionId,
                    amount: Amount,
                    currency: Currency,
                    status: 'success',
                    date: admin.firestore.FieldValue.serverTimestamp(),
                    type: type
                }
            });

             res.json({ code: 0 });
             return;
        }

        if (type === 'fail') {
             // Handle failure (email user?)
             logger.warn(`Payment failed for ${AccountId}`);
             res.json({ code: 0 });
             return;
        }

    } catch (error: any) {
        logger.error('Webhook error', error);
         res.json({ code: 0 }); // Always return 0 to CP to stop retries if logic error, or non-0 to retry
    }
};
