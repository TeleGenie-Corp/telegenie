import React, { Suspense } from 'react';
import { X, MessageCircle, Loader2 } from 'lucide-react';
import { UserProfile, LinkedChannel } from '../../types';

const TelegramSettings = React.lazy(() => import('./TelegramSettings').then(m => ({ default: m.TelegramSettings })));

export const SettingsModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  profile: UserProfile | null;
  onChannelConnect: (c: LinkedChannel) => void;
  onChannelDisconnect: () => void;
  defaultChannelUrl?: string;
}> = ({ isOpen, onClose, profile, onChannelConnect, onChannelDisconnect, defaultChannelUrl }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-lg p-5 sm:p-6 relative animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors">
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-display font-semibold text-[#233137] mb-6">Настройки канала</h2>

        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin text-violet-600" size={24} /></div>}>
          {!profile?.linkedChannel ? (
            <TelegramSettings 
              defaultChannelUrl={defaultChannelUrl}
              linkedChannel={undefined}
              onChannelConnect={(c) => { onChannelConnect(c); onClose(); }}
              onChannelDisconnect={onChannelDisconnect}
            />
          ) : (
            <div className="space-y-6">
              <div className="bg-[#f9fbfb] p-5 rounded-2xl border border-[#f2f2f2] flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-[#9aaeb5] shadow-sm border border-[#f2f2f2]">
                  <MessageCircle size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-[#233137] truncate">{profile.linkedChannel.title}</h3>
                  <a href={`https://t.me/${profile.linkedChannel.username.replace('@','')}`} target="_blank" className="text-xs text-[#9aaeb5] hover:text-[#233137] transition-colors">
                    @{profile.linkedChannel.username.replace('@','')}
                  </a>
                </div>
                <div className="px-2.5 py-1 bg-[#f2f5f5] text-[#758084] rounded-lg text-[10px] font-medium uppercase tracking-wider">
                  Активен
                </div>
              </div>

              <div className="p-4 bg-[#f9fbfb] rounded-xl border border-[#f2f2f2] text-sm text-[#9aaeb5]">
                Бот: <span className="font-mono bg-[#f2f5f5] px-1.5 py-0.5 rounded text-[#758084] text-xs">{profile.linkedChannel.botToken ? `${profile.linkedChannel.botToken.substr(0,10)}...` : 'Бот TeleGenie'}</span>
              </div>

              <button
                onClick={onChannelDisconnect}
                className="w-full py-3 text-rose-500 text-sm font-medium bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-100"
              >
                Отключить канал
              </button>
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
};
