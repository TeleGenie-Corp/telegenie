import React, { useState } from 'react';
import { LinkedChannel } from '../../types';
import { TelegramService } from '../../services/telegramService';
import { MessageCircle, Check, Loader2, AlertCircle, Link2, X } from 'lucide-react';

interface ChannelConnectProps {
  botToken: string;
  linkedChannel?: LinkedChannel;
  onConnect: (channel: LinkedChannel) => void;
  onDisconnect: () => void;
}

export const ChannelConnect: React.FC<ChannelConnectProps> = ({
  botToken,
  linkedChannel,
  onConnect,
  onDisconnect
}) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!username.trim()) {
      setError('Введите @username канала');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await TelegramService.verifyBotInChannel(username, botToken);

    if (!result.success || !result.chatId) {
      setError(result.error || 'Не удалось подключить канал');
      setLoading(false);
      return;
    }

    const channel: LinkedChannel = {
      chatId: result.chatId,
      username: username.startsWith('@') ? username : `@${username}`,
      title: result.title || username,
      linkedAt: Date.now(),
      verified: true
    };

    onConnect(channel);
    setUsername('');
    setLoading(false);
  };

  // Not connected state
  if (!linkedChannel) {
    return (
      <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center text-sky-600">
            <MessageCircle size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Канал для публикации</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Подключите ваш Telegram канал</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">1</div>
            <p className="text-xs text-slate-500">Добавьте <span className="font-bold text-slate-700">@telegenie_beta_bot</span> как администратора в ваш канал с правами на публикацию</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">2</div>
            <p className="text-xs text-slate-500">Введите @username вашего канала ниже</p>
          </div>
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@my_channel"
            className="flex-1 bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm font-medium outline-none focus:border-violet-500 transition-colors"
          />
          <button
            onClick={handleConnect}
            disabled={loading}
            className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
            Подключить
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 px-4 py-3 rounded-xl">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>
    );
  }

  // Connected state
  return (
    <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
            <Check size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{linkedChannel.title}</h3>
            <p className="text-xs text-emerald-600 font-bold">{linkedChannel.username}</p>
          </div>
        </div>
        <button
          onClick={onDisconnect}
          className="text-slate-400 hover:text-rose-500 p-2 transition-colors"
          title="Отключить канал"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};
