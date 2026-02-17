import { SubscriptionPlan } from '@/types';

export const PLANS: SubscriptionPlan[] = [
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
    id: 'expert',
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
