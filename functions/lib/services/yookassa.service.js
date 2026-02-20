"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YooKassaService = void 0;
const uuid_1 = require("uuid");
// YooKassa credentials are injected via Secret Manager using runWith({ secrets: [...] })
// Run: firebase functions:secrets:set YOOKASSA_SHOP_ID
// Run: firebase functions:secrets:set YOOKASSA_SECRET_KEY
const API_URL = 'https://api.yookassa.ru/v3';
class YooKassaService {
    static getAuthHeader() {
        const shopId = process.env.YOOKASSA_SHOP_ID;
        const secretKey = process.env.YOOKASSA_SECRET_KEY;
        if (!shopId || !secretKey) {
            console.error('YooKassa credentials missing. Set YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY secrets.');
            throw new Error('YooKassa credentials missing');
        }
        return 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
    }
    static async createRecurringPayment(params) {
        const idempotenceKey = (0, uuid_1.v4)();
        const body = {
            amount: {
                value: params.amount.toFixed(2),
                currency: params.currency || 'RUB'
            },
            capture: true,
            description: params.description,
            payment_method_id: params.paymentMethodId,
            metadata: params.metadata || {},
            save_payment_method: true
        };
        if (params.email) {
            body.receipt = {
                customer: { email: params.email },
                items: [
                    {
                        description: params.description,
                        quantity: '1.00',
                        amount: { value: params.amount.toFixed(2), currency: 'RUB' },
                        vat_code: 1,
                        payment_mode: 'full_payment',
                        payment_subject: 'service'
                    }
                ]
            };
        }
        try {
            const response = await fetch(`${API_URL}/payments`, {
                method: 'POST',
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Idempotence-Key': idempotenceKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const error = await response.json();
                console.error('YooKassa recurring payment error:', error);
                throw new Error(`YooKassa Error: ${error.description || response.statusText}`);
            }
            return await response.json();
        }
        catch (e) {
            console.error('[YooKassaService] createRecurringPayment failed:', e);
            throw e;
        }
    }
}
exports.YooKassaService = YooKassaService;
//# sourceMappingURL=yookassa.service.js.map