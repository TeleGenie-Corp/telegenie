import React, { useState, useEffect } from 'react';
import { Check, X, Zap, Loader2, Star, Shield, Users, AlertCircle, CreditCard, Trash2, HelpCircle, BadgeCheck, Clock, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { SubscriptionPlan, SubscriptionTier, UserProfile } from '../../types';
import { createPaymentAction, cancelSubscriptionAction, scheduleSubscriptionChangeAction, verifyPaymentAction, unbindCardAction } from '@/app/actions/payment';
import { BrandService } from '../../services/brandService';
import { YookassaWidgetModal } from './YookassaWidgetModal';
import { motion, AnimatePresence } from 'framer-motion';
import { PLANS } from '@/src/constants/plans';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentTier: SubscriptionTier;
  profile: UserProfile | null;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ 
  isOpen, 
  onClose,
  userId,
  currentTier,
  profile
}) => {
  const [plans] = useState<SubscriptionPlan[]>(PLANS);
  const [loading, setLoading] = useState(false);
  const [unbinding, setUnbinding] = useState(false);
  const [brandsCount, setBrandsCount] = useState<number>(0);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      import('../../services/analyticsService').then(({ AnalyticsService }) => {
        AnalyticsService.trackViewSubscription();
      });
      // Fetch Brands Count
      BrandService.getBrands(userId).then(brands => setBrandsCount(brands.length));
    }
  }, [isOpen, userId]);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    setProcessingPlan(plan.id);
    setLoading(true);

    try {
      const currentPlan = plans.find(p => p.id === currentTier);
      const isUpgrade = currentPlan && plan.price > currentPlan.price;
      const isDowngrade = currentPlan && plan.price < currentPlan.price;
      
      if (profile?.subscription?.nextPlanId === plan.id) {
          toast.info("Этот тариф уже запланирован");
          setLoading(false);
          setProcessingPlan(null);
          return;
      }

      if (plan.id === 'free') {
          const result = await cancelSubscriptionAction(userId);
          if (!result.success) throw new Error(result.error);
          toast.success("Автопродление выключено. Пакет Starter включится по окончании периода.");
          window.location.reload();
          return;
      }

      if (isDowngrade) {
          const result = await scheduleSubscriptionChangeAction(userId, plan.id);
          if (!result.success) throw new Error(result.error);
          toast.success(`Тариф изменится на ${plan.name} по окончании текущего периода`);
          setLoading(false);
          setProcessingPlan(null);
          return;
      }

      let result;
      if (isUpgrade && profile?.subscription?.currentPeriodEnd && profile.subscription.status === 'active') {
          const now = Date.now();
          const endDate = profile.subscription.currentPeriodEnd;
          if (endDate > now) {
              const remainingDays = (endDate - now) / (1000 * 60 * 60 * 24);
              const remainingValue = (currentPlan!.price / 30) * remainingDays;
              const payAmount = Math.max(0, Math.floor(plan.price - remainingValue));
              result = await createPaymentAction(userId, plan.id, payAmount);
          } else {
              result = await createPaymentAction(userId, plan.id);
          }
      } else {
          result = await createPaymentAction(userId, plan.id);
      }

      if (result.error) throw new Error(result.error);

      if (result.confirmationToken) {
          if (result.paymentId) {
             setPendingPaymentId(result.paymentId);
             localStorage.setItem('pending_payment_id', result.paymentId);
          }
          setConfirmationToken(result.confirmationToken);
          setWidgetOpen(true);
      } else if (result.confirmationUrl) {
          window.location.href = result.confirmationUrl;
      }
      
    } catch (error: any) {
      toast.error(error.message || "Ошибка при оформлении");
    } finally {
      setLoading(false);
      setProcessingPlan(null);
    }
  };

  const handleUnbindCard = async () => {
      if (!confirm('Вы уверены, что хотите отвязать карту? Это отключит автоматическое продление подписки.')) return;
      
      setUnbinding(true);
      try {
          const result = await unbindCardAction(userId);
          if (result.success) {
              toast.success("Карта успешно отвязана");
              // We could reload or just wait for parent to update profile
              setTimeout(() => window.location.reload(), 1000);
          } else {
              throw new Error(result.error);
          }
      } catch (err: any) {
          toast.error("Ошибка при отвязке: " + err.message);
      } finally {
          setUnbinding(false);
      }
  };

  const currentPeriodEnd = profile?.subscription?.currentPeriodEnd;
  const isAutoRenew = profile?.subscription?.autoRenew;
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  const cardLast4 = profile?.subscription?.cardLast4;
  const cardType = profile?.subscription?.cardType;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div key="subscription-modal-overlay" className="fixed inset-0 z-[150] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
                onClick={onClose} 
              />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-slate-50 dark:bg-slate-950 relative w-full max-w-6xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
              >
                  {/* Header Dashboard */}
                  <div className="p-8 sm:p-10 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-[1.25rem] bg-violet-600 flex items-center justify-center text-white shadow-2xl shadow-violet-200 dark:shadow-none">
                                <Zap size={32} fill="white" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">Центр подписки</h2>
                                <p className="text-slate-500 font-medium">Управление вашим тарифом и платежами</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="absolute top-8 right-8 p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90">
                            <X size={28} />
                        </button>
                    </div>

                    {/* Bento Top Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
                        {/* Status Card */}
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Текущий статус</span>
                                <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-600">
                                    Активен
                                </div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                                    {PLANS.find(p => p.id === currentTier)?.name || 'Starter'}
                                </h3>
                                {currentPeriodEnd && (
                                    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                        <Clock size={14} />
                                        До {formatDate(currentPeriodEnd)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Payment Method Card */}
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Способ оплаты</span>
                                <CreditCard size={18} className="text-slate-400" />
                            </div>
                            {cardLast4 ? (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">•••• {cardLast4}</p>
                                        <p className="text-xs text-slate-400 font-bold uppercase">{cardType || 'Bank Card'}</p>
                                    </div>
                                    <button 
                                        onClick={handleUnbindCard}
                                        disabled={unbinding}
                                        className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all active:scale-90"
                                    >
                                        {unbinding ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                                    </button>
                                </div>
                            ) : (
                                <p className="text-sm font-bold text-slate-400">Карта не привязана</p>
                            )}
                        </div>

                        {/* Quick Action / Highlight / Usage */}
                        <div className="hidden lg:flex bg-emerald-500 p-6 rounded-3xl shadow-xl shadow-emerald-100 dark:shadow-none flex-col justify-between text-white">
                             <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Использование</span>
                                <ArrowUpRight size={18} className="opacity-80" />
                             </div>
                             <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-[10px] font-black uppercase mb-1 opacity-90">
                                        <span>Посты (в месяц)</span>
                                        <span>{profile?.usage?.postsThisMonth || 0} / {PLANS.find(p => p.id === currentTier)?.limits.postsPerMonth || 10}</span>
                                    </div>
                                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-white transition-all duration-500" 
                                            style={{ width: `${Math.min(100, ((profile?.usage?.postsThisMonth || 0) / (PLANS.find(p => p.id === currentTier)?.limits.postsPerMonth || 10)) * 100)}%` }}
                                        />
                                    </div>
                                    {currentPeriodEnd && (
                                        <div className="mt-1.5 text-[9px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1">
                                            <Clock size={8} />
                                            Лимит обновится {formatDate(currentPeriodEnd)}
                                        </div>
                                    )}
                                </div>
                                <div className="pt-2 border-t border-white/10">
                                    <div className="flex justify-between text-[10px] font-black uppercase mb-1 opacity-90">
                                        <span>Бренды (всего)</span>
                                        <span>{brandsCount} / {PLANS.find(p => p.id === currentTier)?.limits.brandsCount || 1}</span>
                                    </div>
                                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-white transition-all duration-500" 
                                            style={{ width: `${Math.min(100, (brandsCount / (PLANS.find(p => p.id === currentTier)?.limits.brandsCount || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                  </div>

                  {/* Plans Selection Area */}
                  <div className="flex-1 overflow-y-auto p-8 sm:p-10 custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {plans.map((plan, index) => {
                              const isCurrent = currentTier === plan.id;
                              const isFeatured = plan.id === 'expert'; 
                              const isScheduled = profile?.subscription?.nextPlanId === plan.id;
                              
                              return (
                                  <motion.div 
                                      key={plan.id}
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: index * 0.1 }}
                                      className={`group relative rounded-[2.5rem] p-8 flex flex-col h-full border-2 transition-all duration-300
                                      ${isCurrent 
                                          ? 'border-violet-600 bg-white dark:bg-slate-900 shadow-2xl shadow-violet-100 dark:shadow-none' 
                                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                                      }`}
                                  >
                                      {isFeatured && (
                                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-violet-600 text-white px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl z-20">
                                              Популярно
                                          </div>
                                      )}
                                      
                                      <div className="flex items-center justify-between mb-8">
                                          <div>
                                              <h3 className="text-2xl font-black text-slate-900 dark:text-white capitalize">{plan.name}</h3>
                                              <div className="flex items-baseline gap-1 mt-1">
                                                <span className="text-3xl font-black text-slate-900 dark:text-white">{plan.price}₽</span>
                                                <span className="text-slate-400 font-bold text-xs uppercase">/мес</span>
                                              </div>
                                          </div>
                                          {isCurrent ? (
                                              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                                  <BadgeCheck size={28} />
                                              </div>
                                          ) : (
                                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isFeatured ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-400'}`}>
                                                  <ArrowUpRight size={24} />
                                              </div>
                                          )}
                                      </div>

                                      <div className="space-y-4 flex-1 mb-10">
                                          <FeatureItem label={`${plan.limits.postsPerMonth >= 1000 ? 'Безлимит' : plan.limits.postsPerMonth} постов / мес`} highlight={isCurrent || isFeatured} />
                                          <FeatureItem label={`${plan.limits.brandsCount} брендов`} highlight={isCurrent || isFeatured} />
                                          {plan.features.slice(0, 4).map((feature, idx) => (
                                              <FeatureItem key={idx} label={feature} />
                                          ))}
                                      </div>

                                      <motion.button
                                          whileTap={{ scale: 0.95 }}
                                          onClick={() => !isCurrent && handleSubscribe(plan)}
                                          disabled={loading || isCurrent || isScheduled}
                                          className={`w-full py-5 rounded-[1.25rem] font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3
                                          ${isCurrent 
                                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100 cursor-default'
                                              : isScheduled
                                                ? 'bg-slate-100 text-slate-400 cursor-default'
                                                : isFeatured
                                                  ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-xl shadow-violet-100'
                                                  : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.02]'
                                          }`}
                                      >
                                          {loading && processingPlan === plan.id ? (
                                              <Loader2 className="animate-spin" />
                                          ) : isCurrent ? (
                                              'Текущий план'
                                          ) : isScheduled ? (
                                              'Запланирован'
                                          ) : (
                                              plan.price > (plans.find(p => p.id === currentTier)?.price || 0) ? 'Улучшить сейчас' : 'Выбрать тариф'
                                          )}
                                      </motion.button>
                                  </motion.div>
                              );
                          })}
                      </div>

                      {/* Footer Info */}
                      <div className="mt-16 flex flex-col md:flex-row items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 gap-6">
                           <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                    <Shield size={24} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Безопасные платежи</p>
                                    <p className="text-xs text-slate-500 font-medium">Ваши данные защищены ЮKassa и PCI DSS</p>
                                </div>
                           </div>
                      </div>
                  </div>
              </motion.div>
          </div>
        )}
      </AnimatePresence>

      <YookassaWidgetModal 
        isOpen={widgetOpen}
        onClose={() => {
            setWidgetOpen(false);
            setProcessingPlan(null);
        }}
        confirmationToken={confirmationToken || ''}
        onSuccess={async () => {
            if (pendingPaymentId) {
                toast.promise(verifyPaymentAction(pendingPaymentId), {
                    loading: 'Проверка платежа...',
                    success: (res) => {
                        if (res.success) {
                            setTimeout(() => window.location.reload(), 1500);
                            return 'Оплата прошла успешно!';
                        }
                        throw new Error(res.error);
                    },
                    error: (err) => `Ошибка проверки: ${err.message}`
                });
            }
        }}
        onError={(err) => {
            toast.error("Ошибка оплаты: " + (err.message || "Неизвестная ошибка"));
            setWidgetOpen(false);
            setProcessingPlan(null);
        }}
      />
    </>
  );
};

const FeatureItem = ({ label, highlight = false }: { label: string; highlight?: boolean }) => (
    <div className="flex items-start gap-4 text-sm group/item">
        <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${highlight ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'}`}>
            <Check size={14} strokeWidth={4} />
        </div>
        <span className={`font-bold transition-colors ${highlight ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{label}</span>
    </div>
);
