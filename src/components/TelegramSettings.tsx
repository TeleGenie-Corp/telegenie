import React, { useState } from 'react';
import { TelegramUser, LinkedChannel } from '../../types';
import { verifyChannelAction } from '@/app/actions/telegram';
import { Loader2, AlertCircle, Link2, X, Send, Check, Settings } from 'lucide-react';

interface TelegramSettingsProps {
  defaultChannelUrl?: string; // New prop for strict demo mode
  linkedChannel?: LinkedChannel;
  onChannelConnect: (channel: LinkedChannel) => void;
  onChannelDisconnect: () => void;
}

const DEFAULT_BOT_NAME = 'telegenie_beta_bot';

export const TelegramSettings: React.FC<TelegramSettingsProps> = ({
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
    let customBotToken: string | undefined = undefined;
    let isCustom = false;

    if (useCustomBot) {
      if (!customToken.trim()) {
        setError('Введите токен вашего бота');
        return;
      }
      customBotToken = customToken.trim();
      isCustom = true;
    } else {
      // Demo mode - token will be retrieved on the server
      
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

    const result = await verifyChannelAction({
      username,
      customBotToken: isCustom ? customBotToken : undefined
    });

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
      botToken: isCustom ? customBotToken : undefined,
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
        
        {/* Helper Instructions — only for custom bot mode */}
        {!linkedChannel && useCustomBot && (
          <div className="bg-[#f9fbfb] rounded-xl p-4 border border-[#f2f2f2] text-sm text-[#758084] space-y-2">
            <h4 className="font-semibold text-[#233137] flex items-center gap-2 text-sm">
              <span className="w-5 h-5 rounded-full bg-[#9aaeb5] text-white flex items-center justify-center text-[10px]">i</span>
              Как подключить свой бот?
            </h4>
            <ol className="list-decimal list-inside space-y-1 ml-1 text-xs">
              <li>Создайте бота в <a href="https://t.me/BotFather" target="_blank" className="text-[#233137] hover:underline font-medium">@BotFather</a> и скопируйте токен.</li>
              <li>Добавьте бота в <b>Администраторы</b> вашего канала с правом публикации.</li>
              <li>Введите токен и юзернейм канала ниже.</li>
            </ol>
          </div>
        )}

        {/* Hint for standard mode */}
        {!linkedChannel && !useCustomBot && (
          <div className="bg-[#f9fbfb] rounded-xl p-4 border border-[#f2f2f2] text-sm text-[#758084]">
            <p className="text-xs leading-relaxed">
              Бот TeleGenie будет публиковать посты от имени вашего канала. Просто добавьте <span className="font-medium text-[#233137]">@{DEFAULT_BOT_NAME}</span> как администратора канала с правом публикации сообщений.
            </p>
            {defaultChannelUrl && (
              <p className="mt-2 text-xs text-[#9aaeb5]">
                Канал для демо: {defaultChannelUrl.replace('https://t.me/', '@')}
              </p>
            )}
          </div>
        )}

        {/* Dynamic Action Area */}
        <div className="w-full">
           
          {/* Connection Form (Show if not connected OR if editing) */}
          {showForm && (
            <div className="w-full animate-in fade-in slide-in-from-top-2">
               
               {/* Mode Switcher */}
               <div className="flex bg-[#f2f5f5] p-1 rounded-xl mb-4 self-start w-fit">
                  <button
                    onClick={() => setUseCustomBot(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!useCustomBot ? 'bg-white text-[#233137] shadow-sm' : 'text-[#9aaeb5] hover:text-[#758084]'}`}
                  >
                    Бот TeleGenie
                  </button>
                  <button
                    onClick={() => setUseCustomBot(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${useCustomBot ? 'bg-white text-[#233137] shadow-sm' : 'text-[#9aaeb5] hover:text-[#758084]'}`}
                  >
                    Свой бот
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
                                placeholder="Токен бота"
                                className="bg-[#f9fbfb] border border-[#f2f2f2] text-[#233137] text-sm rounded-xl px-4 py-3 w-full outline-none focus:border-[#9aaeb5] focus:bg-white transition-all placeholder:text-[#9aaeb5]"
                            />
                        </div>
                    )}

                    {/* Channel Input */}
                    <div className="flex items-center gap-0 bg-[#f9fbfb] border border-[#f2f2f2] rounded-xl focus-within:border-[#9aaeb5] focus-within:bg-white transition-all flex-[3] overflow-hidden">
                        <span className="text-[#9aaeb5] pl-4 py-3 select-none text-sm">t.me/</span>
                        <input
                          type="text"
                          value={username.replace('https://t.me/', '').replace('@', '')}
                          onChange={(e) => setUsername(e.target.value.replace('https://t.me/', '').replace('@', ''))}
                          placeholder="channel_name"
                          disabled={!useCustomBot && !!defaultChannelUrl}
                          className={`bg-transparent text-sm text-[#233137] outline-none w-full py-3 pl-0.5 placeholder:text-[#9aaeb5] ${!useCustomBot && defaultChannelUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                    </div>

                    <button
                        onClick={async () => {
                            await handleConnect();
                            setIsEditing(false);
                        }}
                        disabled={loading}
                        className="bg-[#233137] hover:bg-[#1a2529] text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium active:scale-95 whitespace-nowrap"
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
               
               <div className="flex items-center gap-4 bg-[#f9fbfb] border border-[#f2f2f2] rounded-2xl p-4 flex-1">
                 <div className="w-10 h-10 rounded-full bg-white border border-[#f2f2f2] flex items-center justify-center shadow-sm">
                    <Check size={18} className="text-[#233137]" />
                 </div>
                 <div>
                   <h3 className="text-sm font-semibold text-[#233137] leading-tight">{linkedChannel.title}</h3>
                   <a href={`https://t.me/${linkedChannel.username.replace('@', '')}`} target="_blank" className="text-xs text-[#9aaeb5] hover:text-[#233137] transition-colors">
                     t.me/{linkedChannel.username.replace('@', '')}
                   </a>
                 </div>
               </div>

               <div className="flex items-center gap-2">
                 <button
                    onClick={startEditing}
                    className="h-12 w-12 flex items-center justify-center text-[#9aaeb5] hover:text-[#233137] hover:bg-[#f2f5f5] border border-transparent hover:border-[#f2f2f2] rounded-xl transition-all"
                    title="Настроить"
                  >
                    <Settings size={18} />
                  </button>
               </div>
             </div>
          )}
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mt-4 flex items-center gap-2 text-rose-500 text-xs font-medium bg-rose-50 p-3 rounded-xl border border-rose-100 animate-in fade-in slide-in-from-top-1">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
};
