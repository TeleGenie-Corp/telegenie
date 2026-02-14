import React, { Suspense } from 'react';
import { X, MessageCircle, Loader2 } from 'lucide-react';
import { UserProfile, LinkedChannel } from '../../types';

const TelegramSettings = React.lazy(() => import('./TelegramSettings').then(m => ({ default: m.TelegramSettings })));

const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '';

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
        
        <h2 className="text-xl font-display font-black text-slate-900 mb-6">Channel Settings</h2>

        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin text-violet-600" size={24} /></div>}>
          {!profile?.linkedChannel ? (
            <TelegramSettings 
              botToken={TELEGRAM_BOT_TOKEN} 
              defaultChannelUrl={defaultChannelUrl}
              linkedChannel={undefined}
              onChannelConnect={(c) => { onChannelConnect(c); onClose(); }}
              onChannelDisconnect={onChannelDisconnect}
            />
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-violet-600 shadow-sm border border-slate-100">
                  <MessageCircle size={32} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 truncate">{profile.linkedChannel.title}</h3>
                  <a href={`https://t.me/${profile.linkedChannel.username.replace('@','')}`} target="_blank" className="text-sm font-medium text-violet-500 hover:underline">
                    @{profile.linkedChannel.username.replace('@','')}
                  </a>
                </div>
                <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
                  Active
                </div>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-500">
                Bot Token: <span className="font-mono bg-slate-200 px-1 rounded text-slate-700">{profile.linkedChannel.botToken ? `${profile.linkedChannel.botToken.substr(0,10)}...` : 'Using Demo Bot'}</span>
              </div>

              <button 
                onClick={onChannelDisconnect} 
                className="w-full py-4 text-rose-500 font-bold bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-100"
              >
                Disconnect Channel
              </button>
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
};
