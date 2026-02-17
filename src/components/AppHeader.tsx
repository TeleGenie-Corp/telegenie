import React from 'react';
import { LayoutGrid, Menu, Sun, Moon, LogOut, UserCircle, Sparkles } from 'lucide-react';
import { User, UserProfile, Brand } from '../../types';

interface AppHeaderProps {
  viewMode: 'workspace' | 'editor';
  user: User | null;
  profile: UserProfile | null;
  currentBrand: Brand | null;
  darkMode: boolean;
  showMobileSidebar: boolean;
  onBackToWorkspace: () => void;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  onToggleMobileSidebar: () => void;
  onOpenSubscription: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  viewMode, user, profile, currentBrand,
  darkMode, showMobileSidebar,
  onBackToWorkspace, onToggleDarkMode, onLogout, onToggleMobileSidebar, onOpenSubscription
}) => {
  // Logic to determine display name
  const displayName = profile?.telegram?.first_name 
    || (user?.first_name && user.first_name !== 'User' ? user.first_name : null)
    || profile?.email 
    || user?.email 
    || 'User';

  return (
    <header className="h-16 bg-white border-b border-slate-200 shrink-0 px-6 flex items-center justify-between z-20 shadow-sm relative">
      <div className="flex items-center gap-4">
        {viewMode === 'editor' && (
          <button 
            onClick={onBackToWorkspace}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors text-xs font-medium"
          >
            <LayoutGrid size={14} />
            Workspace
          </button>
        )}
        <div className="hidden lg:flex w-8 h-8 bg-slate-900 rounded-lg items-center justify-center text-white font-black text-xs">TG</div>
        <h1 className="hidden lg:block font-display font-bold text-lg tracking-tight text-slate-900">TeleGenie <span className="text-slate-400 font-medium">Studio</span></h1>
        {currentBrand && viewMode === 'editor' && (
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
            <span>·</span>
            <span className="font-medium text-violet-600">{currentBrand.name}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        {profile && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-bold text-sm text-slate-900">{displayName}</div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider cursor-pointer hover:text-violet-600 transition-colors" onClick={onOpenSubscription}>
                {profile?.subscription?.tier || 'FREE'}
              </div>
            </div>
            <div className="relative group pb-4 -mb-4"> 
              {/* Added padding-bottom to bridge the gap for dropdown */}
              <button className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm transition-transform hover:scale-105 relative z-10">
                {user?.avatar ? (
                  <img src={user.avatar} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <UserCircle className="w-full h-full p-2 text-slate-400" />
                )}
              </button>
              
              <div className="absolute right-0 top-[calc(100%-10px)] pt-4 w-56 opacity-0 group-hover:opacity-100 transition-opacity invisible group-hover:visible z-0 pointer-events-none group-hover:pointer-events-auto">
                <div className="bg-white rounded-xl shadow-xl border border-slate-100 p-2">
                  <div className="px-3 py-2 border-b border-slate-100 mb-2">
                      <p className="text-xs font-medium text-slate-500">План: <span className="text-slate-900 font-bold uppercase">{profile?.subscription?.tier || 'FREE'}</span></p>
                  </div>

                  <button 
                    onClick={onOpenSubscription}
                    className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-violet-50 text-violet-600 hover:text-violet-700 text-sm font-bold mb-1"
                  >
                    <Sparkles size={16} /> {/* Using Sparkles for Upgrade */}
                    Upgrade Plan
                  </button>

                  <button 
                    onClick={onLogout}
                    className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-700 text-sm font-medium"
                  >
                    <LogOut size={16} />
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Mobile Menu Toggle */}
        <button className="md:hidden p-2" onClick={onToggleMobileSidebar}><Menu /></button>
      </div>
    </header>
  );
};
