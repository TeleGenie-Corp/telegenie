import { SubscriptionPlan, SubscriptionTier, Transaction, UserProfile } from '../types';
import { UserService } from './userService';
import { YooKassaService } from './yooKassaService';

const PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Starter',
    price: 0,
    currency: 'RUB',
    limits: {
      postsPerMonth: 5,
      aiTokens: 10000,
      brandsCount: 1
    },
    features: []
  },
  {
    id: 'pro',
    name: 'Expert',
    price: 490,
    currency: 'RUB',
    limits: {
      postsPerMonth: 50,
      aiTokens: 100000,
      brandsCount: 5
    },
    features: []
  },
  {
    id: 'monster',
    name: 'Monster Blogger',
    price: 2490,
    currency: 'RUB',
    limits: {
      postsPerMonth: 250,
      aiTokens: 500000,
      brandsCount: 25
    },
    features: []
  }
];

export class BillingService {

  static getPlans(): SubscriptionPlan[] {
    return PLANS;
  }

  static async subscribe(userId: string, planId: SubscriptionTier, customPrice?: number): Promise<string | null> {
    try {
        const payment = await this.createYooKassaPayment(userId, planId);
        
        if (payment.confirmation?.confirmation_url) {
            return payment.confirmation.confirmation_url;
        }
        
        return null;
    } catch (e) {
        console.error("Subscription error", e);
        return null;
    }
  }

  static async checkLimit(userId: string, feature: 'posts' | 'brands'): Promise<boolean> {
    const profile = await UserService.getUserProfile(userId);
    if (!profile) return false;

    // Default to Free if no sub
    const tier = profile.subscription?.tier || 'free';
    const plan = PLANS.find(p => p.id === tier) || PLANS[0];
    
    if (feature === 'posts') {
       const used = profile.usage?.postsThisMonth || 0;
       return used < plan.limits.postsPerMonth;
    }
    
    if (feature === 'brands') {
       // Dynamic import to avoid circular dependency
       const { BrandService } = await import('./brandService');
       const brands = await BrandService.getBrands(userId);
       return brands.length < plan.limits.brandsCount;
    }

    return false;
  }
  
  static async incrementUsage(userId: string, feature: 'posts' | 'tokens', amount: number = 1): Promise<void> {
      const profile = await UserService.getUserProfile(userId);
      if (!profile) return;
      
      const currentUsage = profile.usage || { postsThisMonth: 0, tokensThisMonth: 0, lastReset: Date.now() };
      
      // Reset logic (naive)
      // Check if lastReset is previous month...
      
      if (feature === 'posts') {
          currentUsage.postsThisMonth += amount;
      } else {
          currentUsage.tokensThisMonth += amount;
      }
      
      await UserService.updateProfile({
          ...profile,
          usage: currentUsage
      });
  }

  static async getTransactions(userId: string): Promise<Transaction[]> {
      // Mock transactions
      return [
          {
              id: 'tx_1',
              userId,
              amount: 0,
              currency: 'RUB',
              status: 'success',
              type: 'subscription',
              createdAt: Date.now() - 10000000,
              planId: 'free'
          }
      ];
  }

  static async cancelSubscription(userId: string): Promise<boolean> {
      try {
          const { functions } = await import('./firebaseConfig');
          const { httpsCallable } = await import('firebase/functions');
          const cancelFn = httpsCallable(functions, 'cancelSubscription');
          await cancelFn();
          
          // Optimistic update
          const profile = await UserService.getUserProfile(userId);
          if (profile && profile.subscription) {
              await UserService.updateProfile({
                  ...profile,
                  subscription: { ...profile.subscription, autoRenew: false }
              });
          }
          return true;
      } catch (e) {
          console.error("Cancel subscription error", e);
          return false;
      }
  }
  /**
   * Process successful payment from YooKassa
   */
  static async processPaymentSuccess(userId: string, planId: string, paymentMethodId?: string) {
    const profile = await UserService.getUserProfile(userId);
    if (!profile) return;

    // Extend subscription
    const currentEnd = profile.subscription?.currentPeriodEnd || Date.now();
    const newEnd = Math.max(currentEnd, Date.now()) + 30 * 24 * 60 * 60 * 1000; // +30 days

    const newSubscription = {
      tier: planId as SubscriptionTier,
      status: 'active' as const,
      currentPeriodEnd: newEnd,
      autoRenew: true,
      yookassaPaymentMethodId: paymentMethodId || profile.subscription?.yookassaPaymentMethodId // Save token for recurrence
    };

    await UserService.updateProfile({
      ...profile,
      subscription: newSubscription
    });
        
    // Reset limits if needed or just let cron handle it
    // For now simplistic: assume limits reset on billing cycle
  }

  /**
   * Create YooKassa payment ensuring Recurrent support
   */
  static async createYooKassaPayment(userId: string, planId: SubscriptionTier) {
    const profile = await UserService.getUserProfile(userId);
    if (!profile) throw new Error("User not found");

    const plan = PLANS.find(p => p.id === planId);
    if (!plan) throw new Error("Plan not found");

    const { YooKassaService } = await import('./yooKassaService');

    const amount = plan.price;
    const description = `Подписка на тариф ${plan.name}`;
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?payment=success`;

    const payment = await YooKassaService.createPayment({
      amount,
      description,
      returnUrl,
      email: profile.email || 'user@telegenie.ai', // TODO: FZ-54 requires valid email
      metadata: {
        userId,
        planId
      },
      savePaymentMethod: true // Important for recurrence!
    });

    return payment;
  }
}
