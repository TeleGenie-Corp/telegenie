import React, { useState } from 'react';
import {
  FileText, Plus, Clock, Check, Archive, ArrowRight,
  Trash2, Loader2,
  Zap, TrendingUp, BookOpen, Megaphone,
  PenLine, Radio,
} from 'lucide-react';
import { Brand, PostProject, PostGoal } from '../../types';

// ─── helpers ──────────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 2)  return 'только что';
  if (m < 60) return `${m} мин. назад`;
  if (h < 24) return `${h} ч. назад`;
  if (d === 1) return 'вчера';
  if (d < 7)  return `${d} дня назад`;
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

const goalMeta: Record<PostGoal, { label: string; icon: React.ReactNode; cls: string }> = {
  [PostGoal.SELL]:    { label: 'Продажа',    icon: <Zap size={10} />,        cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  [PostGoal.ENGAGE]:  { label: 'Вовлечение', icon: <TrendingUp size={10} />, cls: 'bg-violet-50 text-violet-600 border-violet-100' },
  [PostGoal.EDUCATE]: { label: 'Обучение',   icon: <BookOpen size={10} />,   cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  [PostGoal.INFORM]:  { label: 'Инфо',       icon: <Megaphone size={10} />,  cls: 'bg-stone-100 text-stone-600 border-stone-200' },
};

const statusConfig = {
  draft:     { icon: Clock,   color: 'text-stone-500',  bg: 'bg-stone-100',  label: 'Черновик'    },
  published: { icon: Check,   color: 'text-slate-100',  bg: 'bg-slate-900',  label: 'Опубликован' },
  archived:  { icon: Archive, color: 'text-stone-400',  bg: 'bg-stone-50',   label: 'Архив'       },
};

type TabFilter = 'all' | 'draft' | 'published';

// ─── props ────────────────────────────────────────────────────────────────────

interface WorkspaceScreenProps {
  selectedBrand: Brand | null;
  posts: PostProject[];
  onSelectPost: (post: PostProject) => void;
  onCreatePost: (brandId: string) => void;
  onCreateBrand: () => void;
  onDeletePost: (postId: string) => void;
  loading?: boolean;
}

// ─── component ────────────────────────────────────────────────────────────────

export const WorkspaceScreen: React.FC<WorkspaceScreenProps> = ({
  selectedBrand, posts,
  onSelectPost, onCreatePost, onCreateBrand, onDeletePost,
}) => {
  const [tabFilter, setTabFilter] = useState<TabFilter>('all');

  const brandPosts = selectedBrand
    ? posts.filter(p => p.brandId === selectedBrand.id)
    : [];

  const filteredPosts = brandPosts.filter(p => {
    if (tabFilter === 'draft')     return p.status !== 'published';
    if (tabFilter === 'published') return p.status === 'published';
    return true;
  });

  const draftCount     = brandPosts.filter(p => p.status !== 'published').length;
  const publishedCount = brandPosts.filter(p => p.status === 'published').length;

  // ── render ────────────────────────────────────────────────────────────────

  if (!selectedBrand) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center py-20 text-center bg-slate-50">
        <Radio size={40} className="text-slate-200 mb-4" />
        <div className="text-base font-bold text-slate-400 mb-1">Нет источников</div>
        <div className="text-sm text-slate-400 mb-4">Добавь первый Telegram-канал</div>
        <button
          onClick={onCreateBrand}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-violet-500/20"
        >
          <Plus size={15} /> Добавить канал
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#F5F4F0] custom-scrollbar">
      <div className="max-w-4xl mx-auto p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">{selectedBrand.name}</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {draftCount > 0 && (
                <span className="text-stone-500 font-bold">
                  {draftCount}&nbsp;{draftCount === 1 ? 'черновик' : draftCount < 5 ? 'черновика' : 'черновиков'}
                </span>
              )}
              {draftCount > 0 && publishedCount > 0 && <span className="text-stone-300"> · </span>}
              {publishedCount > 0 && (
                <span className="text-stone-800 font-bold">
                  {publishedCount}&nbsp;{publishedCount === 1 ? 'опубликован' : publishedCount < 5 ? 'опубликовано' : 'опубликовано'}
                </span>
              )}
              {draftCount === 0 && publishedCount === 0 && (
                <span>Нет постов</span>
              )}
            </p>
          </div>

          <button
            onClick={() => onCreatePost(selectedBrand.id)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 active:scale-95"
          >
            <PenLine size={13} />
            Написать пост
          </button>
        </div>

        {/* Tab filter */}
        {brandPosts.length > 0 && (
          <div className="flex gap-1 bg-white border border-stone-200 p-1 rounded-xl w-fit shadow-sm">
            {([
              { id: 'all'       as TabFilter, label: 'Все',            count: brandPosts.length },
              { id: 'draft'     as TabFilter, label: 'Черновики',      count: draftCount },
              { id: 'published' as TabFilter, label: 'Опубликованные', count: publishedCount },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setTabFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  tabFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                <span className={`text-[9px] font-black px-1 py-0.5 rounded-full min-w-[16px] text-center ${
                  tabFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Post grid */}
        {filteredPosts.length === 0 ? (
          tabFilter === 'all' ? (
            <button
              onClick={() => onCreatePost(selectedBrand.id)}
              className="w-full p-10 border-2 border-dashed border-slate-200 rounded-2xl text-center hover:border-violet-300 hover:bg-violet-50/50 transition-all"
            >
              <PenLine size={28} className="mx-auto text-slate-300 mb-3" />
              <div className="text-sm font-medium text-slate-500">Нет постов</div>
              <div className="text-xs text-slate-400 mt-1">Напишите первый пост для этого канала</div>
            </button>
          ) : (
            <div className="p-8 border border-slate-200 rounded-2xl text-center bg-white">
              <div className="text-sm text-slate-400">
                {tabFilter === 'draft' ? 'Нет черновиков' : 'Нет опубликованных постов'}
              </div>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredPosts.map(post => {
              const status     = statusConfig[post.status];
              const StatusIcon = status.icon;
              const goal       = post.goal ? goalMeta[post.goal] : null;
              const preview    = post.text?.replace(/<[^>]+>/g, '').slice(0, 120)
                              || post.point
                              || 'Пустой черновик';
              const isDeletable = post.status !== 'published';

              return (
                <div
                  key={post.id}
                  onClick={() => onSelectPost(post)}
                  className="group relative bg-white border border-slate-200 rounded-2xl p-4 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100/60 cursor-pointer transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg ${status.bg} ${status.color} flex items-center justify-center shrink-0`}>
                      <StatusIcon size={14} />
                    </div>
                    <div className="flex-1 min-w-0 pr-5">
                      <div className="text-xs font-bold text-slate-900 line-clamp-2 leading-relaxed">
                        {preview}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      {goal && (
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${goal.cls}`}>
                          {goal.icon} {goal.label}
                        </span>
                      )}
                      <span className={`text-[9px] font-bold ${status.color}`}>{status.label}</span>
                    </div>
                    <span className="text-[9px] text-slate-400">{relativeTime(post.updatedAt)}</span>
                  </div>

                  <ArrowRight
                    size={14}
                    className="absolute top-4 right-4 text-slate-200 group-hover:text-violet-400 transition-colors"
                  />

                  {isDeletable && (
                    <button
                      onClick={e => { e.stopPropagation(); onDeletePost(post.id); }}
                      className="absolute bottom-3 right-3 p-1.5 rounded-lg text-slate-200 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                      title="Удалить"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="pb-4 text-center">
          <a
            href="https://t.me/sphera_spb"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-slate-400 hover:text-violet-600 font-medium transition-colors"
          >
            При поддержке Сферы
          </a>
        </div>
      </div>
    </div>
  );
};
