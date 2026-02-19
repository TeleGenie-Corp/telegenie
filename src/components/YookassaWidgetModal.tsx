import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

interface YookassaWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  confirmationToken: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

declare global {
  interface Window {
    YooMoneyCheckoutWidget: any;
  }
}

export const YookassaWidgetModal: React.FC<YookassaWidgetModalProps> = ({
  isOpen,
  onClose,
  confirmationToken,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(true);
  const widgetLoadedRef = useRef(false);

  useEffect(() => {
    if (isOpen && confirmationToken && !widgetLoadedRef.current) {
      const initializeWidget = () => {
        try {
          const checkout = new window.YooMoneyCheckoutWidget({
            confirmation_token: confirmationToken,
            customization: {
              colors: {
                control_primary: '#7C3AED', // violet-600
                control_primary_content: '#FFFFFF',
                background: '#FFFFFF',
                text: '#0F172A', // slate-900
                border: '#E2E8F0', // slate-200
                control_secondary: '#64748B' // slate-500
              }
            },
            error_callback: (error: any) => {
              console.error('YooKassa Widget Error:', error);
              if (onError) onError(error);
            }
          });

          checkout.on('success', () => {
            if (onSuccess) onSuccess();
            checkout.destroy();
            onClose();
          });

          checkout.on('fail', () => {
            if (onError) onError(new Error('Payment failed'));
            checkout.destroy();
            onClose();
          });

          checkout.render('yookassa-widget-container').then(() => {
              setLoading(false);
          });
          
          widgetLoadedRef.current = true;
        } catch (err) {
          console.error('Failed to initialize YooKassa widget:', err);
          if (onError) onError(err);
        }
      };

      // Ensure script is ready or wait for it
      if (window.YooMoneyCheckoutWidget) {
        initializeWidget();
      } else {
        const checkInterval = setInterval(() => {
          if (window.YooMoneyCheckoutWidget) {
            clearInterval(checkInterval);
            initializeWidget();
          }
        }, 100);
        return () => clearInterval(checkInterval);
      }
    }
    
    if (!isOpen) {
        setLoading(true);
        widgetLoadedRef.current = false;
    }
  }, [isOpen, confirmationToken, onClose, onSuccess, onError]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 1, y: '100%' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full h-full bg-white dark:bg-slate-900 flex flex-col z-10"
          >
            {/* Header */}
            <div className="p-6 sm:p-8 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center text-white shadow-xl shadow-violet-200">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white leading-tight">Безопасная оплата</h3>
                  <p className="text-sm text-slate-500 font-medium">Ваши данные защищены шифрованием TLS</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90"
              >
                <X size={28} />
              </button>
            </div>

            {/* Widget Area */}
            <div className="flex-1 relative bg-white dark:bg-slate-900 flex justify-center overflow-y-auto">
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 bg-white dark:bg-slate-900 transition-opacity duration-300">
                  <div className="relative">
                    <div className="absolute inset-0 bg-violet-500 rounded-full blur-2xl opacity-20 animate-pulse scale-150" />
                    <Loader2 className="animate-spin text-violet-600 relative" size={48} />
                  </div>
                  <p className="text-slate-500 font-black animate-pulse text-sm tracking-widest uppercase">Загрузка платежной формы...</p>
                </div>
              )}
              {/* Center the widget container */}
              <div className="w-full max-w-md h-full py-8 px-4">
                <div id="yookassa-widget-container" className="w-full min-h-[500px]" />
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-8">
                 <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <ShieldCheck size={18} className="text-emerald-500" />
                    Защищено ЮKassa
                 </div>
                 <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-700" />
                 <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <AlertCircle size={18} />
                    отмена в любой момент
                 </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
