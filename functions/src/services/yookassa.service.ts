import * as functions from 'firebase-functions';
import { v4 as uuidv4 } from 'uuid';

// Use firebase functions config instead of process.env for Cloud Functions
// Run: firebase functions:config:set yookassa.shop_id="YOUR_ID" yookassa.secret_key="YOUR_KEY"
const SHOP_ID = functions.config().yookassa?.shop_id || process.env.YOOKASSA_SHOP_ID;
const SECRET_KEY = functions.config().yookassa?.secret_key || process.env.YOOKASSA_SECRET_KEY;
const API_URL = 'https://api.yookassa.ru/v3';

export interface CreatePaymentParams {
  amount: number;
  currency?: 'RUB';
  description: string;
  paymentMethodId: string; // Required for recurring
  email?: string;
  metadata?: Record<string, any>;
}

export class YooKassaService {

  private static getAuthHeader() {
    if (!SHOP_ID || !SECRET_KEY) {
      console.error('YooKassa credentials missing in functions config');
      throw new Error('YooKassa credentials missing');
    }
    return 'Basic ' + Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');
  }

  static async createRecurringPayment(params: CreatePaymentParams): Promise<any> {
    const idempotenceKey = uuidv4();
    
    const body: any = {
      amount: {
        value: params.amount.toFixed(2),
        currency: params.currency || 'RUB'
      },
      capture: true,
      description: params.description,
      payment_method_id: params.paymentMethodId,
      metadata: params.metadata || {},
      save_payment_method: true // Keep it saved
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
    } catch (e) {
      console.error('[YooKassaService] createRecurringPayment failed:', e);
      throw e;
    }
  }
}
