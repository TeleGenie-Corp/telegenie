import { SubscriptionPlan, SubscriptionTier, Transaction, UserProfile } from '../types';
import { UserService } from './userService';

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
    features: [
      '5 постов в месяц',
      'Базовый AI редактор',
      '1 Бренд'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 990,
    currency: 'RUB',
    limits: {
      postsPerMonth: 50,
      aiTokens: 100000,
      brandsCount: 5
    },
    features: [
      '50 постов в месяц',
      'Продвинутый AI (GPT-4/Claude 3)',
      '5 Брендов',
      'Анализ каналов конкурентов',
      'Приоритетная поддержка'
    ]
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 4990,
    currency: 'RUB',
    limits: {
      postsPerMonth: 500,
      aiTokens: 1000000,
      brandsCount: 20
    },
    features: [
      'Безлимит постов (FUP)',
      'Максимальное качество генерации',
      '20 Брендов',
      'API доступ',
      'Персональный менеджер'
    ]
  }
];

export class BillingService {

  static getPlans(): SubscriptionPlan[] {
    return PLANS;
  }

  static async subscribe(userId: string, planId: SubscriptionTier): Promise<boolean> {
    // MOCK PAYMENT PROCESS
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
    
    // In real app: Validate payment via Stripe/Recurly
    // Here: Just upgrade the user
    
    const profile = await UserService.getUserProfile(userId);
    if (!profile) throw new Error("User not found");

    const newSubscription = {
      tier: planId,
      status: 'active' as const,
      currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000, // +30 days
      autoRenew: true
    };
    
    const updatedProfile = {
      ...profile,
      subscription: newSubscription
    };

    await UserService.updateProfile(updatedProfile);
    
    // Create Transaction Record
    // In real app, this comes from webhook
    // We don't have a transaction service yet, so we just log it conceptually
    // or add to a 'transactions' collection if we had one.
    
    return true;
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
       // We would need to count actual brands here.
       // For now, let's assume usage tracking is updated elsewhere or we fetch count.
       // Mocking this check:
       return true; 
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
}
