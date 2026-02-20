import React, { useState } from 'react';
import { TelegramUser, LinkedChannel } from '../../types';
import { TelegramService } from '../../services/telegramService';
import { TelegramLogin } from './TelegramLogin';
import { Loader2, AlertCircle, Link2, X, Send, Check, Settings } from 'lucide-react';

interface TelegramSettingsProps {
  botToken?: string;
  defaultChannelUrl?: string; // New prop for strict demo mode
  linkedChannel?: LinkedChannel;
  onChannelConnect: (channel: LinkedChannel) => void;
  onChannelDisconnect: () => void;
}

const DEFAULT_BOT_NAME = 'telegenie_beta_bot';

export const TelegramSettings: React.FC<TelegramSettingsProps> = ({
  botToken: defaultToken,
  defaultChannelUrl,
  linkedChannel,
  onChannelConnect,
  onChannelDisconnect
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const startEditing = () => {
    if (linkedChannel) {
      setUsername(linkedChannel.username);
      setCustomToken(linkedChannel.botToken || '');
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setUsername('');
    setCustomToken('');
  };

  const [username, setUsername] = useState('');
  const [customToken, setCustomToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [useCustomBot, setUseCustomBot] = useState(false);

  // Auto-switch to custom bot mode if a custom token was used previously
  React.useEffect(() => {
    if (linkedChannel?.botToken) {
      setUseCustomBot(true);
    }
  }, [linkedChannel]);

  // Effect: Enforce default channel in Demo Mode
  React.useEffect(() => {
    if (!useCustomBot && defaultChannelUrl) {
        // Extract username from URL for display logic
        const defaultUsername = defaultChannelUrl.replace('https://t.me/', '').replace('@', '');
        setUsername(defaultUsername);
    } else if (!useCustomBot && !defaultChannelUrl && !linkedChannel) {
        // If no default URL provided, leave empty or clear? 
        // Better to check if we switched FROM custom.
    }
  }, [useCustomBot, defaultChannelUrl]);

  const handleConnect = async () => {
    if (!username.trim()) {
      setError('Введите @username канала');
      return;
    }

    // Determine which token to use based on mode
    let tokenToUse = defaultToken;
    let isCustom = false;

    if (useCustomBot) {
      if (!customToken.trim()) {
        setError('Введите токен вашего бота');
        return;
      }
      tokenToUse = customToken.trim();
      isCustom = true;
    } else {
      // Demo mode
      if (!defaultToken) {
         setError('Демо-бот недоступен. Используйте своего бота.');
         return;
      }
      // Strict check for demo channel if provided
      if (defaultChannelUrl) {
          const defaultUser = defaultChannelUrl.replace('https://t.me/', '').replace('@', '').toLowerCase();
          const currentUser = username.replace('https://t.me/', '').replace('@', '').toLowerCase();
          if (defaultUser !== currentUser) {
             setError(`Демо-бот работает только с каналом @${defaultUser}`);
             return;
          }
      }
    }

    setLoading(true);
    setError(null);

    const { AnalyticsService } = await import('../../services/analyticsService');
    AnalyticsService.trackChannelConnectStart();

    const result = await TelegramService.verifyBotInChannel(username, tokenToUse || '');

    if (!result.success || !result.chatId) {
      const reason = result.error || 'Нет доступа бота';
      setError(result.error || 'Не удалось подключить канал. Проверьте права бота.');
      AnalyticsService.trackChannelConnectFail(reason);
      setLoading(false);
      return;
    }

    const channel: LinkedChannel = {
      chatId: result.chatId,
      username: username.startsWith('@') ? username : `@${username}`,
      title: result.title || username,
      linkedAt: Date.now(),
      verified: true,
      botToken: isCustom ? tokenToUse : undefined,
      photoUrl: result.photoUrl,
      memberCount: result.memberCount
    };
    
    // Explicit cleaning
    if (!isCustom) {
        delete channel.botToken;
    }

    const channelType = username.startsWith('-') ? 'private' : 'public';
    AnalyticsService.trackChannelConnectSuccess(channelType);
    onChannelConnect(channel);
    setUsername('');
    setCustomToken('');
    setLoading(false);
  };

  const showForm = !linkedChannel || isEditing;

  return (
    <div>
      <div className="flex flex-col gap-6">
        
        {/* Helper Instructions */}
        {!linkedChannel && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px]">i</span>
              Как подключить канал?
            </h4>
            <ol className="list-decimal list-inside space-y-1 ml-1 text-xs">
              <li>Создайте бота в <a href="https://t.me/BotFather" target="_blank" className="text-violet-600 hover:underline font-bold">@BotFather</a> и скопируйте <b>Token</b>.</li>
              <li>Добавьте этого бота в <b>Администраторы</b> вашего канала.</li>
              <li>Введите токен и ссылку на канал (t.me/...) ниже.</li>
            </ol>
             {/* Note about Demo Bot */}
             {!useCustomBot && defaultChannelUrl && (
                 <div className="mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                     ✨ Активирован Демо-Бот для {defaultChannelUrl.replace('https://t.me/','@')}
                 </div>
             )}
          </div>
        )}

        {/* Dynamic Action Area */}
        <div className="w-full">
           
          {/* Connection Form (Show if not connected OR if editing) */}
          {showForm && (
            <div className="w-full animate-in fade-in slide-in-from-top-2">
               
               {/* Mode Switcher */}
               <div className="flex bg-slate-100 p-1 rounded-xl mb-4 self-start w-fit">
                  <button
                    onClick={() => setUseCustomBot(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!useCustomBot ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Демо-Бот
                  </button>
                  <button
                    onClick={() => setUseCustomBot(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${useCustomBot ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Свой Бот
                  </button>
               </div>

               <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Bot Token Input (Custom Only) */}
                    {useCustomBot && (
                        <div className="relative group flex-[2] animate-in fade-in slide-in-from-left-2 duration-300">
                            <input
                                type="password"
                                value={customToken}
                                onChange={(e) => setCustomToken(e.target.value)}
                                placeholder="Ваш Bot Token"
                                className="bg-slate-50 border border-slate-100 text-slate-900 text-sm font-medium rounded-xl px-4 py-3 w-full outline-none focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-400"
                            />
                        </div>
                    )}

                    {/* Channel Input */}
                    <div className="flex items-center gap-0 bg-slate-50 border border-slate-100 rounded-xl focus-within:border-violet-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-500/10 transition-all flex-[3] overflow-hidden">
                        <span className="text-slate-400 pl-4 py-3 select-none text-sm font-medium">t.me/</span>
                        <input
                        type="text"
                        value={username.replace('https://t.me/', '').replace('@', '')}
                        onChange={(e) => setUsername(e.target.value.replace('https://t.me/', '').replace('@', ''))}
                        placeholder="channel_name"
                        disabled={!useCustomBot && !!defaultChannelUrl} // Lock input if Demo Mode
                        className={`bg-transparent text-sm font-bold text-slate-900 outline-none w-full py-3 pl-0.5 placeholder:text-slate-400 placeholder:font-medium ${!useCustomBot && defaultChannelUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                    </div>

                    <button
                        onClick={async () => {
                            await handleConnect();
                            setIsEditing(false);
                        }}
                        disabled={loading}
                        className="bg-slate-900 hover:bg-violet-600 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm shadow-lg shadow-slate-200 hover:shadow-violet-200 active:scale-95 whitespace-nowrap"
                        >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <>Подключить <Link2 size={18} /></>}
                    </button>
               </div>


              {/* Cancel Edit Button */}
              {isEditing && (
                <button 
                  onClick={cancelEditing}
                  className="px-4 py-3 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all font-bold text-sm"
                  title="Отмена"
                >
                  Отмена
                </button>
              )}

            </div>
          )}

          {/* Connected State (Show only if connected AND NOT editing) */}
          {linkedChannel && !isEditing && (
             <div className="flex items-center justify-between gap-4 w-full animate-in fade-in slide-in-from-bottom-2">
               
               <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 flex-1">
                 <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
                    <Check size={20} className="text-slate-900" />
                 </div>
                 <div>
                   <h3 className="text-base font-black text-slate-900 leading-tight">{linkedChannel.title}</h3>
                   <a href={`https://t.me/${linkedChannel.username.replace('@', '')}`} target="_blank" className="text-xs font-bold text-violet-500 hover:underline hover:text-violet-600 transition-colors">
                     t.me/{linkedChannel.username.replace('@', '')}
                   </a>
                 </div>
               </div>

               <div className="flex items-center gap-2">
                 <button
                    onClick={startEditing}
                    className="h-14 w-14 flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 border border-transparent hover:border-violet-100 rounded-2xl transition-all"
                    title="Настроить"
                  >
                    <Settings size={22} />
                  </button>
               </div>
             </div>
          )}
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mt-4 flex items-center gap-2 text-rose-500 text-xs font-bold bg-rose-50 p-3 rounded-xl border border-rose-100 animate-in fade-in slide-in-from-top-1">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
};
