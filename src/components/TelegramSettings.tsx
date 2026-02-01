import React, { useState } from 'react';
import { TelegramUser, LinkedChannel } from '../../types';
import { TelegramService } from '../../services/telegramService';
import { TelegramLogin } from './TelegramLogin';
import { Loader2, AlertCircle, Link2, X, Send, Check, Settings } from 'lucide-react';

interface TelegramSettingsProps {
  botToken?: string;
  linkedChannel?: LinkedChannel;
  onChannelConnect: (channel: LinkedChannel) => void;
  onChannelDisconnect: () => void;
}

const DEFAULT_BOT_NAME = 'telegenie_beta_bot';

export const TelegramSettings: React.FC<TelegramSettingsProps> = ({
  botToken: defaultToken,
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
    }

    setLoading(true);
    setError(null);

    const result = await TelegramService.verifyBotInChannel(username, tokenToUse);

    if (!result.success || !result.chatId) {
      setError(result.error || 'Не удалось подключить канал. Проверьте права бота.');
      setLoading(false);
      return;
    }

    const channel: LinkedChannel = {
      chatId: result.chatId,
      username: username.startsWith('@') ? username : `@${username}`,
      title: result.title || username,
      linkedAt: Date.now(),
      verified: true,
      botToken: isCustom ? tokenToUse : undefined // undefined is fine for local objects, but checking for Firestore safety next step.
      // actually, Firestore hates undefined. Let's make it null if not present, but types say string | undefined. 
      // The Service likely handles the DB save. If the DB save is failing on undefined, we should maybe delete the key if undefined before saving?
      // Or simply explicit null. 
      // Let's rely on the parent or service to clean it up, BUT the error came from "setDoc". 
      // If we pass 'undefined' to setDoc it fails. 
      // Safe fix: Use null for "no custom token" if the Type allows it. 
      // Checking types: botToken?: string. 
      // If I cannot change types easily right now, I will omit the key if undefined.
    };

    // To avoid "undefined" error in Firestore, we ensure we don't pass undefined.
    // The previous error was: "Unsupported field value: undefined".
    // We will clean this up in the parent, OR we ensure it's null here? 
    // Types say string | undefined. So we can't pass null if strict.
    // Wait, the UserProfile has linkedChannel?: LinkedChannel.
    // The error happens when saving this object to Firestore.
    // I should probably ensure the 'onChannelConnect' handler cleans this up, OR I conditionally create the object.
    
    // Better strategy:
    const safeChannel = {
        ...channel,
         botToken: isCustom ? tokenToUse : null 
    } as any; // Temporary cast to bypass strict check if type forbids null, to fix runtime error.
    // Actually, let's fix the type in types.ts in a separate step if needed, but for now, let's just NOT include the key if it is undefined.
    
    if (!isCustom) {
        delete channel.botToken;
    }

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
                        className="bg-transparent text-sm font-bold text-slate-900 outline-none w-full py-3 pl-0.5 placeholder:text-slate-400 placeholder:font-medium"
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
