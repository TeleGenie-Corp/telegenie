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
exports.handleWebhook = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("../utils/crypto");
const API_SECRET = process.env.CLOUDPAYMENTS_API_SECRET || 'test_api_secret';
const handleWebhook = async (req, res) => {
    if (!(0, crypto_1.isValidSignature)(req, API_SECRET)) {
        res.status(401).send('Invalid signature');
        return;
    }
    const { TransactionId, Amount, Currency, AccountId, Status, Data, Token } = req.body;
    const type = req.query.type;
    const db = admin.firestore();
    const userRef = db.collection('users').doc(AccountId);
    try {
        if (type === 'check') {
            const doc = await userRef.get();
            if (!doc.exists) {
                res.json({ code: 13 });
                return;
            }
            res.json({ code: 0 });
            return;
        }
        if (type === 'pay' || type === 'recurrent') {
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                logger.error(`User ${AccountId} not found for payment`);
                res.json({ code: 0 });
                return;
            }
            let planId = 'pro';
            try {
                const metadata = typeof Data === 'string' ? JSON.parse(Data) : Data;
                if (metadata?.planId)
                    planId = metadata.planId;
            }
            catch (e) { }
            const subscription = {
                tier: planId,
                status: 'active',
                currentPeriodEnd: Date.now() + 32 * 24 * 60 * 60 * 1000,
                autoRenew: true,
                recurrentToken: Token
            };
            await userRef.update({
                subscription: subscription,
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
            logger.warn(`Payment failed for ${AccountId}`);
            res.json({ code: 0 });
            return;
        }
    }
    catch (error) {
        logger.error('Webhook error', error);
        res.json({ code: 0 });
    }
};
exports.handleWebhook = handleWebhook;
//# sourceMappingURL=payment.controller.js.map