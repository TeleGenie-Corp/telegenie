import { v4 as uuidv4 } from 'uuid';

const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
const API_URL = 'https://api.yookassa.ru/v3';

if (!SHOP_ID || !SECRET_KEY) {
  console.error('[YooKassaService] Credentials missing!');
}

const getAuthHeader = () => {
  return 'Basic ' + Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');
};

export interface CreatePaymentParams {
  amount: number;
  currency?: 'RUB';
  description: string;
  returnUrl: string;
  email?: string; // For receipt (FZ-54)
  metadata?: Record<string, any>;
  paymentMethodId?: string; // For recurrent payments
  savePaymentMethod?: boolean; // To save method for future
  confirmationType?: 'redirect' | 'embedded' | 'qr';
}

export interface YooKassaPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  paid: boolean;
  amount: { value: string; currency: string };
  confirmation?: { type: string; confirmation_url: string; confirmation_token?: string };
  payment_method?: { id: string; saved: boolean };
  metadata?: Record<string, any>;
}

export class YooKassaService {

  /**
   * Create a payment
   */
  static async createPayment(params: CreatePaymentParams): Promise<YooKassaPayment> {
    const idempotenceKey = uuidv4();
    
    // Base body
    const body: any = {
      amount: {
        value: params.amount.toFixed(2),
        currency: params.currency || 'RUB'
      },
      capture: true,
      description: params.description,
      metadata: params.metadata || {},
    };

    if (params.paymentMethodId) {
      // Recurrent payment (auto-charge)
      body.payment_method_id = params.paymentMethodId;
    } else {
      // New payment (user interaction required)
      body.confirmation = {
        type: params.confirmationType || 'redirect',
        locale: 'ru_RU'
      };

      if (params.confirmationType !== 'embedded') {
          body.confirmation.return_url = params.returnUrl;
      } else {
          // Embedded also needs return_url according to docs, but sometimes it receives it differently.
          // Docs say: "return_url" is required for embedded too.
          body.confirmation.return_url = params.returnUrl;
      }
      
      if (params.savePaymentMethod) {
        body.save_payment_method = true;
      }
    }

    // Receipt (FZ-54) logic if email provided
    if (params.email) {
      body.receipt = {
        customer: { email: params.email },
        items: [
          {
            description: params.description,
            quantity: '1.00',
            amount: {
              value: params.amount.toFixed(2),
              currency: params.currency || 'RUB'
            },
            vat_code: 1, // Without VAT 
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
          'Authorization': getAuthHeader(),
          'Idempotence-Key': idempotenceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { description: errorText };
        }
        console.error('YooKassa createPayment error:', errorData);
        throw new Error(`YooKassa Error: ${errorData.description || response.statusText}`);
      }

      return await response.json();
    } catch (e) {
      console.error('[YooKassaService] createPayment failed:', e);
      throw e;
    }
  }

  /**
   * Get payment info
   */
  static async getPayment(paymentId: string): Promise<YooKassaPayment> {
    try {
      const response = await fetch(`${API_URL}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`YooKassa getPayment error: ${response.statusText}`);
      }

      return await response.json();
    } catch (e) {
      console.error('[YooKassaService] getPayment failed:', e);
      throw e;
    }
  }
}
