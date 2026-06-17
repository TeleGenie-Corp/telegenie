import React, { Suspense } from 'react';
import { X, MessageCircle, Loader2 } from 'lucide-react';
import { Brand, UserProfile, LinkedChannel } from '../../types';

const TelegramSettings = React.lazy(() => import('./TelegramSettings').then(m => ({ default: m.TelegramSettings })));

export const SettingsModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  profile: UserProfile | null;
  currentBrand?: Brand | null;
  onChannelConnect: (c: LinkedChannel) => void;
  onChannelDisconnect: () => void;
  onBrandChannelConnect?: (c: LinkedChannel) => Promise<void> | void;
  onBrandChannelDisconnect?: () => Promise<void> | void;
  defaultChannelUrl?: string;
}> = ({
  isOpen,
  onClose,
  profile,
  currentBrand,
  onChannelConnect,
  onChannelDisconnect,
  onBrandChannelConnect,
  onBrandChannelDisconnect,
  defaultChannelUrl,
}) => {
  if (!isOpen) return null;

  const globalChannel = profile?.linkedChannel;
  const brandChannel = currentBrand?.linkedChannel;
  const isBrandContext = !!currentBrand;
  const activeChannel = isBrandContext ? brandChannel : globalChannel;
  const fallbackChannel = isBrandContext && !brandChannel ? globalChannel : undefined;
  const connectHandler = isBrandContext && onBrandChannelConnect ? onBrandChannelConnect : onChannelConnect;
  const disconnectHandler = isBrandContext && onBrandChannelDisconnect ? onBrandChannelDisconnect : onChannelDisconnect;
  const title = isBrandContext ? `Публикация для «${currentBrand.name}»` : 'Общий канал публикации';
  const description = isBrandContext
    ? 'Голос бренда уже изучен отдельно. Здесь выбираем, куда отправлять готовые посты.'
    : 'Этот канал используется для публикации, если у выбранного голоса нет своего канала.';

  const renderConnectedChannel = (channel: LinkedChannel, label: string, onDisconnect?: () => void | Promise<void>) => (
    <div className="space-y-4">
      <div className="bg-[#f9fbfb] p-5 rounded-2xl border border-[#f2f2f2] flex items-center gap-4">
        <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-[#9aaeb5] shadow-sm border border-[#f2f2f2]">
          <MessageCircle size={28} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-[#9aaeb5] mb-1">{label}</div>
          <h3 className="text-base font-semibold text-[#233137] truncate">{channel.title}</h3>
          <a href={`https://t.me/${channel.username.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#9aaeb5] hover:text-[#233137] transition-colors">
            @{channel.username.replace('@','')}
          </a>
        </div>
        <div className="px-2.5 py-1 bg-[#f2f5f5] text-[#758084] rounded-lg text-[10px] font-medium uppercase tracking-wider">
          Активен
        </div>
      </div>

      <div className="p-4 bg-[#f9fbfb] rounded-xl border border-[#f2f2f2] text-sm text-[#758084]">
        Публикация готова: TeleGenie может отправлять посты в этот канал.
      </div>

      {onDisconnect && (
        <button
          onClick={async () => { await onDisconnect(); onClose(); }}
          className="w-full py-3 text-rose-500 text-sm font-medium bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-100"
        >
          {isBrandContext ? 'Отключить канал этого голоса' : 'Отключить общий канал'}
        </button>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-lg p-5 sm:p-6 relative animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors">
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-display font-semibold text-[#233137] mb-1">{title}</h2>
        <p className="text-sm text-[#758084] mb-6 pr-10">{description}</p>

        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin text-violet-600" size={24} /></div>}>
          <div className="space-y-5">
            {isBrandContext && currentBrand && (
              <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-1">Голос бренда</div>
                <div className="text-sm font-bold text-[#233137]">{currentBrand.name}</div>
                <a href={currentBrand.channelUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#758084] hover:text-violet-700 transition-colors">
                  {currentBrand.channelUrl}
                </a>
              </div>
            )}

            {activeChannel ? (
              renderConnectedChannel(
                activeChannel,
                isBrandContext ? 'Отдельный канал этого голоса' : 'Общий канал',
                disconnectHandler,
              )
            ) : (
              <>
                {fallbackChannel && renderConnectedChannel(fallbackChannel, 'Сейчас используется общий канал')}
                <div className="rounded-2xl border border-dashed border-slate-200 p-4">
                  <div className="text-sm font-bold text-[#233137] mb-1">
                    {isBrandContext ? 'Подключить отдельный канал для этого голоса' : 'Подключить общий канал'}
                  </div>
                  <p className="text-xs text-[#758084] mb-4 leading-relaxed">
                    {isBrandContext
                      ? 'После подключения предпросмотр и публикация будут работать именно с этим каналом.'
                      : 'Он будет использоваться для всех голосов без отдельного канала публикации.'}
                  </p>
                  <TelegramSettings
                    defaultChannelUrl={isBrandContext ? undefined : defaultChannelUrl}
                    linkedChannel={undefined}
                    onChannelConnect={async (c) => { await connectHandler(c); onClose(); }}
                    onChannelDisconnect={disconnectHandler}
                  />
                </div>
              </>
            )}
          </div>
        </Suspense>
      </div>
    </div>
  );
};
