import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, CheckCircle2, Calendar } from 'lucide-react';
import { PostProject, Brand } from '../../types';

interface PublishedPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostProject | null;
  brand: Brand | null;
}

export const PublishedPostModal: React.FC<PublishedPostModalProps> = ({
  isOpen, onClose, post, brand
}) => {
  if (!post) return null;

  const lc = post.publishedChannel || brand?.linkedChannel;
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
      postLink = `https://t.me/c/${fullChatId.toString().replace('-100', '')}/${messageId}`;
    }
  }

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

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
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#f2f2f2] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#f2f5f5] text-[#9aaeb5] flex items-center justify-center">
                  <CheckCircle2 size={17} />
                </div>
                <div>
                  <h3 className="font-medium text-[#233137] text-sm leading-tight">Пост опубликован</h3>
                  <p className="text-[10px] text-[#9aaeb5] uppercase tracking-widest">Просмотр публикации</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-[#f2f5f5] rounded-lg text-[#9aaeb5] transition-colors"
              >
                <X size={17} />
              </button>
            </div>

            {/* Telegram-style preview — scrollable */}
            <div className="overflow-y-auto bg-[#879bb1] bg-[url('https://web.telegram.org/img/bg_0.png')] p-5">
              <div className="max-w-sm mx-auto bg-white rounded-xl p-3 shadow-lg ring-1 ring-black/5">
                {/* Channel row */}
                <div className="flex items-center gap-2.5 mb-3 pb-2 border-b border-slate-50">
                  {channelPhoto ? (
                    <img src={channelPhoto} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#9aaeb5] flex items-center justify-center text-white font-semibold text-[11px] shrink-0">
                      {channelTitle[0]}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 truncate">{channelTitle}</div>
                    <div className="text-[10px] text-slate-400">{channelUsername || (lc?.chatId ? 'Приватный канал' : '')}</div>
                  </div>
                </div>

                {post.imageUrl && (
                  <div className="rounded-lg overflow-hidden mb-3">
                    <img src={post.imageUrl} alt="" className="w-full h-auto object-cover" />
                  </div>
                )}

                <div
                  className="text-sm leading-[1.6] text-slate-900 break-words
                    [&_p]:my-0 [&_p]:min-h-[1.6em] [&_p:empty]:block
                    [&_a]:text-[#5e8090] [&_a]:underline [&_a]:underline-offset-2"
                  dangerouslySetInnerHTML={{ __html: post.text }}
                />

                <div className="flex justify-end mt-2 text-[10px] text-slate-400">
                  {new Date(post.publishedAt || post.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 bg-[#f9fbfb] border-t border-[#f2f2f2] space-y-3 shrink-0">
              <div className="flex items-center gap-2 text-[11px] text-[#9aaeb5]">
                <Calendar size={12} />
                <span>{post.publishedAt ? formatDate(post.publishedAt) : 'Дата неизвестна'}</span>
              </div>

              {postLink ? (
                <div className="space-y-2">
                  <button
                    onClick={() => window.open(postLink, '_blank')}
                    className="w-full py-3 bg-[#233137] hover:bg-[#1a2529] text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors active:scale-95"
                  >
                    <ExternalLink size={15} />
                    Открыть в Telegram
                  </button>
                  <p className="text-[10px] text-[#9aaeb5] text-center break-all px-2 select-all">{postLink}</p>
                </div>
              ) : (
                <div className="p-3 bg-[#f2f5f5] rounded-xl border border-[#e8e8e8] text-center">
                  <p className="text-[11px] text-[#758084]">Пост опубликован, но ссылка на сообщение не сохранилась.</p>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-3 bg-white border border-[#e8e8e8] text-[#758084] rounded-xl text-sm hover:bg-[#f2f5f5] transition-colors"
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
