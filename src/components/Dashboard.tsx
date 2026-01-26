import React from 'react';
import { User } from '../types';
import { LogOut, User as UserIcon } from 'lucide-react';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  return (
    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
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
          <h2 className="font-display text-2xl font-bold text-slate-900">{user.first_name} {user.username && <span className="text-slate-400 text-lg font-normal">@{user.username}</span>}</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {user.isMock ? 'Demo Access' : 'Telegram Verified'}
          </p>
          <div className="flex gap-2 justify-center sm:justify-start pt-2">
             <span className="text-[9px] bg-violet-50 text-violet-600 px-3 py-1 rounded-full font-bold uppercase tracking-wide">Pro Plan</span>
             <span className="text-[9px] bg-slate-50 text-slate-500 px-3 py-1 rounded-full font-bold uppercase tracking-wide">ID: {user.id}</span>
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </div>
  );
};
