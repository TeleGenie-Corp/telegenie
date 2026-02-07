import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Initialize Firebase Admin once
if (admin.apps.length === 0) {
    admin.initializeApp();
}

// Imports from modules
import { ChannelService } from "./services/channel.service";
import { handleWebhook } from "./controllers/payment.controller";

/**
 * 1. Channel Info Scraper
 */
export const getChannelInfo = onRequest({ cors: true }, async (req, res) => {
    const username = (req.query.name as string) || (req.body.name as string) || 'nenashev_vision';
    
    logger.info(`Processing request for target: ${username}`, { structuredData: true });
    
    const service = new ChannelService();
    const result = await service.getChannelInfo(username);
    res.json(result);
});

/**
 * 2. CloudPayments Webhook
 */
export const cpWebhook = onRequest({ cors: true }, handleWebhook);

/**
 * 3. Migration / Admin Tools
 */
export const seedCredits = onRequest({ cors: true }, async (req, res) => {
    const authSecret = req.headers['x-migration-secret'];
    if (authSecret !== 'TElegenIe_Studio_2026_SeEd') {
        res.status(403).send('Unauthorized');
        return;
    }

    try {
        const auth = admin.auth();
        const db = admin.firestore();
        const listUsersResult = await auth.listUsers();
        
        const results: any[] = [];
        for (const userRecord of listUsersResult.users) {
            const userRef = db.collection('users').doc(userRecord.uid);
            const doc = await userRef.get();

            if (!doc.exists) {
                const profile = {
                    userId: userRecord.uid,
                    savedStrategies: [] as any[],
                    generationHistory: [] as any[],
                    balance: 1000,
                    createdAt: Date.now(),
                    migrated: true
                };
                await userRef.set(profile);
                results.push({ uid: userRecord.uid, action: 'created' });
            } else {
                const data = doc.data();
                if (data?.balance === undefined) {
                    await userRef.update({ balance: 1000, migrated: true });
                    results.push({ uid: userRecord.uid, action: 'updated' });
                } else {
                    results.push({ uid: userRecord.uid, action: 'skipped' });
                }
            }
        }
        res.json({ success: true, processed: results.length, details: results });
    } catch (error: any) {
        logger.error('Migration failed:', error);
        res.status(500).json({ error: error.message });
    }
});
