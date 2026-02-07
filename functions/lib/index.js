"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedCredits = exports.cpWebhook = exports.getChannelInfo = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const channel_service_1 = require("./services/channel.service");
const payment_controller_1 = require("./controllers/payment.controller");
exports.getChannelInfo = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    const username = req.query.name || req.body.name || 'nenashev_vision';
    logger.info(`Processing request for target: ${username}`, { structuredData: true });
    const service = new channel_service_1.ChannelService();
    const result = await service.getChannelInfo(username);
    res.json(result);
});
exports.cpWebhook = (0, https_1.onRequest)({ cors: true }, payment_controller_1.handleWebhook);
exports.seedCredits = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    const authSecret = req.headers['x-migration-secret'];
    if (authSecret !== 'TElegenIe_Studio_2026_SeEd') {
        res.status(403).send('Unauthorized');
        return;
    }
    try {
        const auth = admin.auth();
        const db = admin.firestore();
        const listUsersResult = await auth.listUsers();
        const results = [];
        for (const userRecord of listUsersResult.users) {
            const userRef = db.collection('users').doc(userRecord.uid);
            const doc = await userRef.get();
            if (!doc.exists) {
                const profile = {
                    userId: userRecord.uid,
                    savedStrategies: [],
                    generationHistory: [],
                    balance: 1000,
                    createdAt: Date.now(),
                    migrated: true
                };
                await userRef.set(profile);
                results.push({ uid: userRecord.uid, action: 'created' });
            }
            else {
                const data = doc.data();
                if (data?.balance === undefined) {
                    await userRef.update({ balance: 1000, migrated: true });
                    results.push({ uid: userRecord.uid, action: 'updated' });
                }
                else {
                    results.push({ uid: userRecord.uid, action: 'skipped' });
                }
            }
        }
        res.json({ success: true, processed: results.length, details: results });
    }
    catch (error) {
        logger.error('Migration failed:', error);
        res.status(500).json({ error: error.message });
    }
});
//# sourceMappingURL=index.js.map