import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Send, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { PostProject, Brand } from '../../types';

interface PublishedPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostProject | null;
  brand: Brand | null;
}

export const PublishedPostModal: React.FC<PublishedPostModalProps> = ({
  isOpen,
  onClose,
  post,
  brand
}) => {
  if (!post) return null;

  const lc = post.publishedChannel || brand?.linkedChannel;
  
  // Use metadata from snapshot if available, otherwise fallback to brand
  const channelTitle = post.publishedChannel?.title || lc?.title || brand?.name || 'Канал';
  const channelPhoto = (!post.publishedChannel && lc && 'photoUrl' in lc) ? (lc as any).photoUrl : undefined; 
  const channelUsername = post.publishedChannel?.username || lc?.username;

  let postLink = '';
  const messageId = post.publishedMessageId;
  
  if (messageId) {
    const cleanUsername = channelUsername?.replace('@', '');
    if (cleanUsername) {
        postLink = `https://t.me/${cleanUsername}/${messageId}`;
    } else if (post.publishedChannel?.chatId || lc?.chatId) {
        const fullChatId = post.publishedChannel?.chatId || lc?.chatId || '';
        const cleanId = fullChatId.toString().replace('-100', '');
        postLink = `https://t.me/c/${cleanId}/${messageId}`;
    }
  }

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="font-display font-black text-slate-900 dark:text-white leading-tight">Пост опубликован</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Просмотр публикации</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                title="Закрыть"
              >
                <X size={20} />
              </button>
            </div>

            {/* Telegram-style Preview Container */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#879bb1] bg-[url('https://web.telegram.org/img/bg_0.png')]">
              <div className="max-w-sm mx-auto p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xl ring-1 ring-black/5">
                {/* Channel Header (Telegram Style) */}
                <div className="flex items-center gap-3 mb-3 pb-2 border-b border-slate-50 dark:border-slate-800">
                  {channelPhoto ? (
                    <img src={channelPhoto} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {channelTitle[0]}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{channelTitle}</div>
                    <div className="text-[10px] text-slate-500">{channelUsername || (lc?.chatId ? 'Приватный канал' : 'Не подключен')}</div>
                  </div>
                </div>

                {/* Content */}
                {post.imageUrl && (
                  <div className="rounded-xl overflow-hidden mb-3">
                    <img src={post.imageUrl} alt="" className="w-full h-auto object-cover" />
                  </div>
                )}
                <div 
                  className="text-sm leading-relaxed text-slate-900 dark:text-slate-100 break-words prose prose-sm max-w-none 
                    prose-p:my-0 prose-p:min-h-[1.25rem] 
                    [&_p:empty]:h-[1.25rem] [&_p:empty]:block
                    [&_p>br]:h-[1.25rem]
                    [&_p]:mb-0" 
                  dangerouslySetInnerHTML={{ __html: post.text }} 
                />
                
                {/* Meta */}
                <div className="flex justify-end items-center mt-2 text-[10px] text-slate-400">
                  <span>{new Date(post.publishedAt || post.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mb-2 px-1">
                <div className="flex items-center gap-1.5">
                   <Calendar size={12} />
                   <span>{post.publishedAt ? formatDate(post.publishedAt) : 'Дата неизвестна'}</span>
                </div>
              </div>

              {postLink ? (
                <div className="space-y-2">
                  <button
                    onClick={() => window.open(postLink, '_blank')}
                    className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-lg active:scale-[0.98]"
                  >
                    <ExternalLink size={16} />
                    Открыть в Telegram
                  </button>
                  <p className="text-[10px] text-slate-400 text-center break-all px-4 select-all">
                    {postLink}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Ссылка не найдена</p>
                  <p className="text-[11px] text-amber-600">Пост был опубликован, но ID сообщения не сохранился.</p>
                </div>
              )}
              
              <button
                onClick={onClose}
                className="w-full py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                Закрыть
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
