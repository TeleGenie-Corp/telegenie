import React from 'react';
import { User, UserProfile } from '../types';
import { LogOut, User as UserIcon, Wallet, ArrowUpRight } from 'lucide-react';

interface DashboardProps {
  user: User;
  profile: UserProfile | null;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, profile, onLogout }) => {
  return (
    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row items-center gap-8">
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left flex-1">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-slate-50 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-slate-300">
              {user.avatar ? (
                <img src={user.avatar} alt={user.first_name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={40} />
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full"></div>
          </div>

          <div className="flex-1 space-y-1">
            <h2 className="font-display text-2xl font-bold text-slate-900">{user.first_name} {user.email && <span className="text-slate-400 text-sm font-normal ml-2">{user.email}</span>}</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {user.email ? 'Google Verified Member' : 'Telegram Verified Member'}
            </p>
            <div className="flex gap-2 justify-center sm:justify-start pt-2">
               <span className="text-[9px] bg-violet-50 text-violet-600 px-3 py-1 rounded-full font-bold uppercase tracking-wide">Elite Content Studio</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <div className="bg-slate-900 text-white p-6 pr-8 rounded-[2rem] flex items-center gap-8 shadow-xl min-w-[280px]">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-violet-400">
                <Wallet size={24} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Balance Available</p>
                <div className="flex items-center gap-4">
                  <h3 className="text-2xl font-black tracking-tighter">
                    ${profile?.balance.toFixed(2) || '0.00'}
                  </h3>
                  <button 
                    className="bg-violet-600 hover:bg-white hover:text-slate-900 text-white w-8 h-8 rounded-lg flex items-center justify-center transition-all group"
                    title="Add Funds"
                  >
                    <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <button 
              onClick={onLogout}
              className="bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 h-[48px] px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 group"
            >
              <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
