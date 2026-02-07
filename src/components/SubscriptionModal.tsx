import React, { useState, useEffect } from 'react';
import { Check, X, Zap, Loader2, Star, Shield, Users } from 'lucide-react';
import { SubscriptionPlan, SubscriptionTier, UserProfile } from '../../types';
import { BillingService } from '../../services/billingService';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentTier: SubscriptionTier;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ 
  isOpen, 
  onClose,
  userId,
  currentTier
}) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPlans(BillingService.getPlans());
    }
  }, [isOpen]);

  const handleSubscribe = async (planId: SubscriptionTier) => {
    setProcessingPlan(planId);
    setLoading(true);
    try {
      await BillingService.subscribe(userId, planId);
      // In a real app we'd show success and maybe confetti
      onClose();
      // Force reload or callback to update profile in parent
      window.location.reload(); 
    } catch (error) {
      console.error("Subscription failed", error);
    } finally {
      setLoading(false);
      setProcessingPlan(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
        
        <div className="bg-white relative w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            
            <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors z-10">
                <X size={24} />
            </button>

            <div className="p-8 pb-0 text-center">
                <h2 className="text-3xl font-display font-black text-slate-900 mb-2">
                    Выберите свой план
                </h2>
                <p className="text-slate-500 max-w-lg mx-auto">
                    Разблокируйте полную мощь AI для управления вашими Telegram каналами.
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => {
                        const isCurrent = currentTier === plan.id;
                        const isFeatures = plan.id === 'pro'; // Highlight Pro
                        
                        return (
                            <div 
                                key={plan.id}
                                className={`relative rounded-[2rem] p-6 flex flex-col h-full border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
                                ${isCurrent 
                                    ? 'border-emerald-500 bg-emerald-50/10' 
                                    : isFeatures 
                                        ? 'border-violet-600 shadow-lg shadow-violet-100' 
                                        : 'border-slate-100 hover:border-violet-200'
                                }`}
                            >
                                {isFeatures && !isCurrent && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-violet-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                                        Most Popular
                                    </div>
                                )}
                                
                                {isCurrent && (
                                    <div className="absolute top-4 right-4 text-emerald-600 bg-emerald-100 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                                        <Check size={12} strokeWidth={4} /> Current
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-slate-900">
                                            {plan.price > 0 ? `${plan.price}₽` : 'Бесплатно'}
                                        </span>
                                        {plan.price > 0 && <span className="text-slate-400 font-medium">/мес</span>}
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

                                <button
                                    onClick={() => !isCurrent && handleSubscribe(plan.id)}
                                    disabled={loading || isCurrent}
                                    className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2
                                    ${isCurrent 
                                        ? 'bg-slate-100 text-slate-400 cursor-default'
                                        : isFeatures
                                            ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-200'
                                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                                    }`}
                                >
                                    {loading && processingPlan === plan.id ? (
                                        <Loader2 className="animate-spin" />
                                    ) : isCurrent ? (
                                        'Ваш текущий план'
                                    ) : (
                                        'Выбрать план'
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
                
                <div className="mt-12 text-center text-xs text-slate-400 max-w-2xl mx-auto">
                    Оплата происходит через безопасный шлюз. Вы можете отменить подписку в любой момент в настройках.
                    При отмене подписка действует до конца оплаченного периода.
                </div>
            </div>
        </div>
    </div>
  );
};

const FeatureItem = ({ label, highlight = false }: { label: string; highlight?: boolean }) => (
    <div className="flex items-start gap-3 text-sm">
        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${highlight ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-400'}`}>
            <Check size={12} strokeWidth={3} />
        </div>
        <span className={`font-medium ${highlight ? 'text-slate-900' : 'text-slate-600'}`}>{label}</span>
    </div>
);
