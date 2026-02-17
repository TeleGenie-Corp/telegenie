import React, { useState, useEffect } from 'react';
import { Check, X, Zap, Loader2, Star, Shield, Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { SubscriptionPlan, SubscriptionTier, UserProfile } from '../../types';
import { BillingService } from '../../services/billingService';
import { UserService } from '../../services/userService';
import { createPaymentAction } from '@/app/actions/payment';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentTier: SubscriptionTier;
  profile: UserProfile | null;
}

import { motion, AnimatePresence } from 'framer-motion';

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ 
  isOpen, 
  onClose,
  userId,
  currentTier,
  profile
}) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPlans(BillingService.getPlans());
      import('../../services/analyticsService').then(({ AnalyticsService }) => {
        AnalyticsService.trackViewSubscription();
      });
    }
  }, [isOpen]);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    setProcessingPlan(plan.id);
    setLoading(true);

    try {
      const currentPlan = plans.find(p => p.id === currentTier);
      const isUpgrade = currentPlan && plan.price > currentPlan.price;
      const isDowngrade = currentPlan && plan.price < currentPlan.price;
      let confirmationUrl: string | null = null;

      // Logic for Upgrade with Proration
      if (isUpgrade && profile?.subscription?.currentPeriodEnd && profile.subscription.status === 'active') {
          const now = Date.now();
          const endDate = profile.subscription.currentPeriodEnd;
          
          if (endDate > now) {
              const remainingDays = (endDate - now) / (1000 * 60 * 60 * 24);
              const dailyRate = currentPlan!.price / 30;
              const remainingValue = dailyRate * remainingDays;
              
              // Calculate difference to pay
              const payAmount = Math.max(0, Math.floor(plan.price - remainingValue));
              
              const confirmed = window.confirm(`Сменить план на ${plan.name}?\nБудет списана разница: ${payAmount}₽ (с учетом остатка ${Math.floor(remainingValue)}₽).\nНовый период начнется сегодня.`);
              if (!confirmed) {
                  setLoading(false);
                  setProcessingPlan(null);
                  return;
              }

              const result = await createPaymentAction(userId, plan.id, payAmount);
              if (result.error) throw new Error(result.error);
              confirmationUrl = result.confirmationUrl || null;
          } else {
              // Expired or generic
              const result = await createPaymentAction(userId, plan.id);
              if (result.error) throw new Error(result.error);
              confirmationUrl = result.confirmationUrl || null;
          }
      } 
      // Logic for Downgrade
      else if (isDowngrade) {
          if (plan.id === 'free') {
              const confirmed = window.confirm(`Вы уверены, что хотите отменить подписку?\nАвтопродление будет отключено. Текущий период доработает до конца.`);
              if (confirmed) {
                  await BillingService.cancelSubscription(userId);
                  window.location.reload();
              }
              return;
          } else {
              // Monster -> Pro or similar
              const confirmed = window.confirm(`Перейти на план ${plan.name}?\nВнимание: Текущий план будет аннулирован, новый план активируется сразу. Переплаты не возвращаются.`);
              if (confirmed) {
                  // Cancel current billing
                  await BillingService.cancelSubscription(userId);
                  // Manually update tier to new lower tier immediately
                   if (profile) {
                       await UserService.updateProfile({
                           ...profile,
                           subscription: { ...profile.subscription!, tier: plan.id, autoRenew: false }
                       });
                   }
                   // Re-subscribe to new plan? Or just let them be free until they pay?
                   // Usually downgrade means paying for cheaper plan.
                   const result = await createPaymentAction(userId, plan.id);
                   if (result.error) throw new Error(result.error);
                   confirmationUrl = result.confirmationUrl || null;
              }
          }
      } 
      // Standard Subscribe
      else {
          const result = await createPaymentAction(userId, plan.id);
          if (result.error) throw new Error(result.error);
          confirmationUrl = result.confirmationUrl || null;
      }
      
      if (confirmationUrl) {
          window.location.href = confirmationUrl;
      } else if (!isDowngrade || (isDowngrade && plan.price > 0)) {
           // If we expected a URL but got null (and it wasn't a free downgrade)
           // But actually downgrade to free returns undefined confirmationUrl which is fine.
           // The logic above ensures confirmationUrl is set if we called subscribe.
           if (plan.price > 0 && !confirmationUrl) {
               toast.error("Ошибка инициализации платежа");
           }
      }
      
      // onClose(); // Don't close if redirecting
    } catch (error) {
      console.error("Subscription failed", error);
      toast.error("Ошибка при оформлении");
    } finally {
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
                            <span>Статус: <span className={isAutoRenew ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-amber-600 dark:text-amber-400 font-bold"}>{isAutoRenew ? "Автопродление" : "Отменится"}</span></span>
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
                            const isFeatures = plan.id === 'pro'; 
                            
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
