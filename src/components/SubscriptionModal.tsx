import React, { useState, useEffect } from 'react';
import { Check, X, Zap, Loader2, Star, Shield, Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { SubscriptionPlan, SubscriptionTier, UserProfile } from '../../types';
import { UserService } from '../../services/userService';
import { createPaymentAction, cancelSubscriptionAction, scheduleSubscriptionChangeAction } from '@/app/actions/payment';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentTier: SubscriptionTier;
  profile: UserProfile | null;
}

import { motion, AnimatePresence } from 'framer-motion';

import { PLANS } from '@/src/constants/plans';

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ 
  isOpen, 
  onClose,
  userId,
  currentTier,
  profile
}) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(PLANS);
  const [loading, setLoading] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  // YooKassa Widget Logic Removed. Standard redirect flow.

  useEffect(() => {
      // Analytics tracking
    if (isOpen) {
      import('../../services/analyticsService').then(({ AnalyticsService }) => {
        AnalyticsService.trackViewSubscription();
      });
    }
  }, [isOpen]);

  // Reset state when closing
  useEffect(() => {
      if (!isOpen) {
          setProcessingPlan(null);
      }
  }, [isOpen]);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    setProcessingPlan(plan.id);
    setLoading(true);

    try {
      const currentPlan = plans.find(p => p.id === currentTier);
      const isUpgrade = currentPlan && plan.price > currentPlan.price;
      const isDowngrade = currentPlan && plan.price < currentPlan.price;
      
      const isNext = profile?.subscription?.nextPlanId === plan.id;
      const willBeFree = !profile?.subscription?.nextPlanId && !profile?.subscription?.autoRenew && plan.id === 'free';

      if (isNext || willBeFree) {
          toast.info("Этот тариф уже запланирован");
          setLoading(false);
          setProcessingPlan(null);
          return;
      }

      // 1. Logic for Downgrade to Free
      if (plan.id === 'free') {
          const result = await cancelSubscriptionAction(userId);
          if (!result.success) throw new Error(result.error);
          toast.success("Автопродление выключено. Пакет Starter включится по окончании периода.");
          window.location.reload();
          return;
      }

      // 2. Logic for Downgrade to another Paid Plan
      if (isDowngrade) {
          const result = await scheduleSubscriptionChangeAction(userId, plan.id);
          if (!result.success) throw new Error(result.error);
          toast.success(`Тариф изменится на ${plan.name} по окончании текущего периода`);
          setLoading(false);
          setProcessingPlan(null);
          return;
      }

      // 3. Logic for Upgrade (with Proration if active)
      let confirmationUrl: string | null = null;
      let paymentId: string | null = null;

      if (isUpgrade && profile?.subscription?.currentPeriodEnd && profile.subscription.status === 'active') {
          const now = Date.now();
          const endDate = profile.subscription.currentPeriodEnd;
          
          if (endDate > now) {
              const remainingDays = (endDate - now) / (1000 * 60 * 60 * 24);
              const dailyRate = currentPlan!.price / 30;
              const remainingValue = dailyRate * remainingDays;
              const payAmount = Math.max(0, Math.floor(plan.price - remainingValue));
              
              const result = await createPaymentAction(userId, plan.id, payAmount);
              if (result.error) throw new Error(result.error);
              confirmationUrl = result.confirmationUrl || null;
              paymentId = result.paymentId || null;
          } else {
              const result = await createPaymentAction(userId, plan.id);
              if (result.error) throw new Error(result.error);
              confirmationUrl = result.confirmationUrl || null;
              paymentId = result.paymentId || null;
          }
      } 
      // 4. Standard Purchase
      else {
          const result = await createPaymentAction(userId, plan.id);
          if (result.error) throw new Error(result.error);
          confirmationUrl = result.confirmationUrl || null;
          paymentId = result.paymentId || null;
      }
      
      if (confirmationUrl) {
          if (paymentId) {
             localStorage.setItem('pending_payment_id', paymentId);
          }
          window.location.href = confirmationUrl;
      } else {
          toast.error("Ошибка инициализации платежа");
          setLoading(false);
          setProcessingPlan(null);
      }
      
    } catch (error: any) {
      console.error("Subscription failed", error);
      toast.error(error.message || "Ошибка при оформлении");
      setLoading(false);
      setProcessingPlan(null);
    }
  };

  const currentPeriodEnd = profile?.subscription?.currentPeriodEnd;
  const isAutoRenew = profile?.subscription?.autoRenew;
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('ru-RU');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" 
              onClick={onClose} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 relative w-full max-w-lg sm:max-w-2xl lg:max-w-5xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                
                <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors z-10">
                    <X size={24} />
                </button>

                <div className="p-8 pb-0 text-center">
                    <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white mb-2">
                        Тарифы и Подписка
                    </h2>
                    {currentPeriodEnd && (
                        <div className="flex items-center justify-center gap-2 mt-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 py-1 px-3 rounded-full inline-flex mx-auto w-fit border border-slate-100 dark:border-slate-700">
                            <AlertCircle size={14} />
                            <span>Активен до: <span className="font-bold text-slate-900 dark:text-white">{formatDate(currentPeriodEnd)}</span></span>
                             • 
                            <span>Статус: <span className={(isAutoRenew && !profile?.subscription?.nextPlanId) ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-amber-600 dark:text-amber-400 font-bold"}>
                                {profile?.subscription?.nextPlanId 
                                    ? `Следующий тариф: ${PLANS.find(p => p.id === profile?.subscription?.nextPlanId)?.name}` 
                                    : (isAutoRenew ? "Автопродление" : "Следующий тариф: Starter")
                                }
                            </span></span>
                        </div>
                    )}
                    {!currentPeriodEnd && (
                       <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                        Разблокируйте полную мощь AI для управления вашими Telegram каналами.
                       </p>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                        {plans.map((plan) => {
                            const isCurrent = currentTier === plan.id;
                            const isFeatures = plan.id === 'expert'; 
                            
                            return (
                                <motion.div 
                                    key={plan.id}
                                    whileHover={{ y: -5 }}
                                    className={`relative rounded-3xl p-5 lg:p-6 flex flex-col h-full border-2 transition-all duration-300 shadow-sm hover:shadow-xl
                                    ${isCurrent 
                                        ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-900/10' 
                                        : isFeatures 
                                            ? 'border-violet-600 shadow-lg shadow-violet-100 dark:shadow-none' 
                                            : 'border-slate-100 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-800 bg-white dark:bg-slate-800'
                                    }`}
                                >
                                    {isFeatures && !isCurrent && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-violet-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg z-10">
                                            Most Popular
                                        </div>
                                    )}
                                    
                                    {isCurrent && (
                                        <div className="absolute top-4 right-4 text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                                            <Check size={12} strokeWidth={4} /> Current
                                        </div>
                                    )}

                                    <div className="mb-6">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-black text-slate-900 dark:text-white">
                                                {plan.price > 0 ? `${plan.price}₽` : 'Бесплатно'}
                                            </span>
                                            {plan.price > 0 && <span className="text-slate-400 dark:text-slate-500 font-medium">/мес</span>}
                                        </div>
                                    </div>

                                    <div className="space-y-4 flex-1 mb-8">
                                        {plan.limits.postsPerMonth < 1000 && (
                                            <FeatureItem label={`${plan.limits.postsPerMonth} постов/мес`} />
                                        )}
                                        {plan.limits.postsPerMonth >= 1000 && (
                                            <FeatureItem label="Безлимит постов" highlight />
                                        )}
                                        <FeatureItem label={`До ${plan.limits.brandsCount} брендов`} />
                                        {plan.features.map((feature, idx) => (
                                            <FeatureItem key={idx} label={feature} />
                                        ))}
                                    </div>

                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => !isCurrent && handleSubscribe(plan)}
                                        disabled={loading || isCurrent}
                                        className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2
                                        ${isCurrent 
                                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-default'
                                            : isFeatures
                                                ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-200 dark:shadow-none'
                                                : 'bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900'
                                        }`}
                                    >
                                        {loading && processingPlan === plan.id ? (
                                            <Loader2 className="animate-spin" />
                                        ) : isCurrent ? (
                                            'Ваш текущий план'
                                        ) : (profile?.subscription?.nextPlanId === plan.id || (!profile?.subscription?.nextPlanId && !profile?.subscription?.autoRenew && plan.id === 'free')) ? (
                                            'Запланирован'
                                        ) : (
                                            plan.price > (plans.find(p => p.id === currentTier)?.price || 0) 
                                            ? 'Улучшить' 
                                            : plan.price === 0 ? 'Отменить подписку' : 'Перейти'
                                        )}
                                    </motion.button>
                                </motion.div>
                            );
                        })}
                    </div>

                    
                    <div className="mt-12 text-center text-xs text-slate-400 dark:text-slate-500 max-w-2xl mx-auto">
                        Оплата происходит через безопасный шлюз. Вы можете отменить подписку в любой момент.
                        При отмене подписка действует до конца оплаченного периода.
                    </div>
                </div>
            </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const FeatureItem = ({ label, highlight = false }: { label: string; highlight?: boolean }) => (
    <div className="flex items-start gap-3 text-sm">
        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${highlight ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
            <Check size={12} strokeWidth={3} />
        </div>
        <span className={`font-medium ${highlight ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{label}</span>
    </div>
);
