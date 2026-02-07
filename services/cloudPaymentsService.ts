
declare global {
  interface Window {
    cp: any; // CloudPayments Widget instance
  }
}

interface PaymentData {
  amount: number;
  currency: string;
  invoiceId?: string;
  accountId: string; // User ID
  description: string;
  email?: string;
  data?: any; // CloudPayments specific data (e.g. for recurrent)
}

export class CloudPaymentsService {
  private static widget: any;

  private static getWidget() {
    if (!this.widget && window.cp) {
      this.widget = new window.cp.CloudPayments();
    }
    return this.widget;
  }

  static async pay(payment: PaymentData): Promise<{ success: boolean; transactionId?: string }> {
    const widget = this.getWidget();
    if (!widget) {
      console.error("CloudPayments widget not loaded");
      return { success: false };
    }

    return new Promise((resolve) => {
      widget.pay('auth', { // 'auth' for two-stage or 'charge' for one-stage. Subscription usually 'charge' w/ recurrent
        publicId: import.meta.env.VITE_CLOUDPAYMENTS_PUBLIC_ID || 'test_api_00000000000000000000001', // Fallback to test ID
        description: payment.description,
        amount: payment.amount,
        currency: payment.currency,
        accountId: payment.accountId,
        invoiceId: payment.invoiceId,
        email: payment.email,
        skin: "mini", // or "modern"
        data: payment.data
      }, {
        onSuccess: (options: any) => { // success
          resolve({ success: true, transactionId: options.transactionId }); // Note: raw options structure depends on CP version
        },
        onFail: (reason: any, options: any) => { // fail
          console.error("Payment failed", reason);
          resolve({ success: false });
        },
        onComplete: (paymentResult: any, options: any) => { // success or fail
          // Optional: handle complete
        }
      });
    });
  }

  static async createSubscription(userId: string, email: string, plan: { id: string, price: number, name: string }): Promise<boolean> {
     // For subscriptions, we usually pass a 'CloudPayments' object in 'data' field to set up recurrent
     // However, simpler way is to make a payment and then set up subscription via API token.
     // OR use the widget's 'recurrent' feature if supported by specific setup.
     // Standard approach: Make first payment -> Helper creates a subscription token on backend.
     
     // For this iteration, we treat it as a payment with a "subscribe" intent.
     // The Cloud Function webhook will see this is for a plan and set up recurrence (if using CP subscriptions API) 
     // or we just trust CP's recurrent feature.
     
     const result = await this.pay({
         amount: plan.price,
         currency: 'RUB',
         accountId: userId,
         description: `Подписка на тариф ${plan.name} (TeleGenie)`,
         email: email,
         data: {
             cloudPayments: {
                 recurrent: { 
                     interval: 'Month', 
                     period: 1, 
                     customerReceipt: {
                         Items: [ // 54-FZ receipt
                             {
                                 label: `Подписка ${plan.name}`,
                                 price: plan.price,
                                 quantity: 1,
                                 amount: plan.price,
                                 vat: 0, // No VAT for now
                                 method: 0,
                                 object: 0,
                             }
                         ]
                     }
                 } 
             },
             planId: plan.id // Pass plan ID for our webhook
         }
     });

     return result.success;
  }
}
