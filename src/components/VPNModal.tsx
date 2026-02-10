import React from 'react';
import { Globe2, ShieldAlert, RefreshCw, ExternalLink } from 'lucide-react';

interface VPNModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
}

export const VPNModal: React.FC<VPNModalProps> = ({ isOpen, onClose, onRetry }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm relative overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header Art */}
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            </div>
            
            <div className="relative z-10 mx-auto w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 border border-white/10">
                <Globe2 size={32} className="text-blue-400" />
                <div className="absolute -top-1 -right-1 bg-rose-500 rounded-full p-1 border-2 border-slate-900">
                    <ShieldAlert size={12} className="text-white" />
                </div>
            </div>
            
            <h2 className="text-xl font-display font-black text-white mb-1">
                Доступ Ограничен
            </h2>
            <p className="text-slate-400 text-xs font-medium">
                AI недоступен в вашем регионе
            </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
            <div className="text-sm text-slate-600 text-center leading-relaxed">
                Google AI (Gemini) временно недоступен в данной локации. Пожалуйста, включите <b>VPN</b> (США/Европа) для работы генерации.
            </div>

            <div className="space-y-3 pt-2">
                <button 
                    onClick={onRetry}
                    className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-200"
                >
                    <RefreshCw size={16} />
                    Я включил VPN, проверить
                </button>
                
                <button 
                    onClick={onClose}
                    className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-xl font-bold text-sm transition-colors"
                >
                    Закрыть
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};
