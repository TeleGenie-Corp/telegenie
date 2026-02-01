import React from 'react';
import { User, UserProfile } from '../../types';
import { LogOut, User as UserIcon, Wallet, ArrowUpRight, MessageCircle } from 'lucide-react';

interface DashboardProps {
  user: User;
  profile: UserProfile | null;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, profile, onLogout }) => {
  const isTelegramLinked = !!profile?.telegram;
  const isChannelLinked = !!profile?.linkedChannel;

  return (
    <div className="bg-slate-50/50 rounded-[2rem] p-4 sm:p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Identity Group */}
        <div className="flex items-center gap-4 bg-white rounded-[1.5rem] p-2 pr-6 shadow-sm w-full lg:w-auto">
          <div className="relative group shrink-0">
            <div className="w-14 h-14 rounded-full bg-slate-50 border-2 border-slate-100 overflow-hidden flex items-center justify-center text-slate-300">
              {user.avatar ? (
                <img src={user.avatar} alt={user.first_name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={24} />
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <h2 className="font-bold text-slate-900 leading-none">
                {user.first_name}
              </h2>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                {user.email?.split('@')[0] || 'Member'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Group */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          {/* Balance Pill */}
          <div className="bg-slate-900 text-white pl-5 pr-2 py-2 rounded-[1.25rem] flex items-center gap-3 flex-1 lg:flex-none justify-between lg:justify-start">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">Баланс</span>
              <span className="font-black text-sm tracking-tight">${profile ? profile.balance.toFixed(2) : '0.00'}</span>
            </div>
            <button 
              className="bg-white/10 hover:bg-white hover:text-slate-900 text-white w-8 h-8 rounded-xl flex items-center justify-center transition-all"
              title="Пополнить"
            >
              <ArrowUpRight size={14} />
            </button>
          </div>

          {/* Logout Button */}
          <button 
            onClick={onLogout}
            className="w-12 h-12 flex items-center justify-center bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-[1.25rem] shadow-sm transition-all"
            title="Выйти"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
