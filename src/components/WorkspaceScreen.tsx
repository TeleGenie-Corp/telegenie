import React, { useState } from 'react';
import {
  Plus, Clock, Check, Archive, ArrowRight,
  Trash2,
  Zap, TrendingUp, BookOpen, Megaphone,
  PenLine, Radio, Sparkles, Image as ImageIcon, Send,
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

const DAY_MS = 86_400_000;

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
  const mediaDraftCount = brandPosts.filter(p => p.status !== 'published' && !!p.imageUrl).length;
  const staleDraftCount = brandPosts.filter(p => p.status !== 'published' && Date.now() - p.updatedAt > 7 * DAY_MS).length;
  const publishRatio = brandPosts.length ? Math.round((publishedCount / brandPosts.length) * 100) : 0;
  const analyzedTone = selectedBrand?.analyzedChannel?.toneOfVoice || selectedBrand?.analyzedChannel?.context;
  const nextDraft = brandPosts
    .filter(p => p.status !== 'published')
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const latestPublished = brandPosts
    .filter(p => p.status === 'published')
    .sort((a, b) => (b.publishedAt || b.updatedAt) - (a.publishedAt || a.updatedAt))[0];
  const processSteps = [
    {
      label: 'Черновики',
      count: draftCount,
      hint: nextDraft ? relativeTime(nextDraft.updatedAt) : 'нет хвостов',
      icon: PenLine,
      cls: 'bg-[#f5efe7] text-[#7c4a24]',
      bar: draftCount ? Math.min(100, 24 + draftCount * 12) : 8,
    },
    {
      label: 'С медиа',
      count: mediaDraftCount,
      hint: mediaDraftCount ? 'готовы визуально' : 'можно без картинок',
      icon: ImageIcon,
      cls: 'bg-violet-50 text-violet-700',
      bar: mediaDraftCount ? Math.min(100, 24 + mediaDraftCount * 18) : 8,
    },
    {
      label: 'Опубликовано',
      count: publishedCount,
      hint: latestPublished ? relativeTime(latestPublished.publishedAt || latestPublished.updatedAt) : 'пока пусто',
      icon: Send,
      cls: 'bg-[#e7f4ef] text-[#20664a]',
      bar: publishedCount ? Math.min(100, 18 + publishedCount * 8) : 8,
    },
  ];

  // ── render ────────────────────────────────────────────────────────────────

  if (!selectedBrand) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center py-20 text-center bg-[#f2f5f5]">
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
    <div className="flex-1 h-full overflow-y-auto bg-[#f2f5f5] custom-scrollbar">
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

        {/* Visual process map */}
        <div className="overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1fr_240px]">
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#9aaeb5]">Карта процесса</div>
                  <h3 className="mt-1 text-base font-black tracking-tight text-[#233137]">Где сейчас живут ваши посты</h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-[#233137]">{publishRatio}%</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#9aaeb5]">выпущено</div>
                </div>
              </div>

              <div className="relative mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="absolute left-[16%] right-[16%] top-8 hidden h-px bg-[#e8e8e8] sm:block" />
                {processSteps.map((step) => (
                  <div key={step.label} className="relative rounded-xl border border-slate-100 bg-[#f8fafa] p-3">
                    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${step.cls}`}>
                      <step.icon size={17} />
                    </div>
                    <div className="text-2xl font-black text-[#233137]">{step.count}</div>
                    <div className="mt-0.5 text-xs font-black text-[#233137]">{step.label}</div>
                    <div className="mt-1 truncate text-[10px] text-[#758084]">{step.hint}</div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-[#233137]" style={{ width: `${step.bar}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#e8e8e8] bg-[#233137] p-4 text-white lg:border-l lg:border-t-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-white/45">Фокус</div>
              <div className="mt-2 text-lg font-black leading-tight">
                {nextDraft ? 'Один черновик ближе всего к выпуску' : 'Пора завести свежую мысль'}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-white/65">
                {staleDraftCount > 0
                  ? `${staleDraftCount} старых черновиков лучше дописать или убрать.`
                  : nextDraft
                    ? 'Откройте последний черновик, доведите финал и выпускайте.'
                    : 'Начните с одной мысли — структуру и тон TeleGenie соберёт дальше.'}
              </p>
              <button
                onClick={() => nextDraft ? onSelectPost(nextDraft) : onCreatePost(selectedBrand.id)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-black uppercase tracking-widest text-[#233137] transition-all hover:bg-violet-50 active:scale-95"
              >
                {nextDraft ? 'Открыть черновик' : 'Начать пост'}
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Guided next step */}
        <div className="bg-white border border-[#e8e8e8] rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#9aaeb5] mb-1.5">
                <Sparkles size={12} className="text-violet-500" />
                Что написать сегодня
              </div>
              <h3 className="text-base font-black text-[#233137] tracking-tight">
                {nextDraft ? 'Продолжить черновик или начать новый пост' : 'Начните с первого поста в стиле канала'}
              </h3>
              <p className="text-xs text-[#758084] mt-1 leading-relaxed">
                {analyzedTone
                  ? 'Голос канала учтён. Можно сразу писать.'
                  : 'Добавьте анализ канала, и посты будут звучать ближе к вашему авторскому голосу.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {nextDraft && (
                <button
                  onClick={() => onSelectPost(nextDraft)}
                  className="px-3 py-2 rounded-xl bg-[#233137] text-white text-xs font-bold hover:bg-[#1a2529] transition-all active:scale-95"
                >
                  Продолжить черновик
                </button>
              )}
              <button
                onClick={() => onCreatePost(selectedBrand.id)}
                className="px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-all active:scale-95"
              >
                Написать новый
              </button>
            </div>
          </div>

          <details className="group mt-4 rounded-xl border border-slate-100 bg-[#f8fafa]">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[11px] font-bold text-slate-500">
              <span>Шаблоны для старта</span>
              <span className="text-slate-300 transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="hidden grid-cols-1 gap-2 px-3 pb-3 group-open:grid sm:grid-cols-3">
              {[
                { icon: PenLine, title: 'Личный инсайт', text: 'история из практики с выводом' },
                { icon: BookOpen, title: 'Полезный разбор', text: 'объяснить сложное простым языком' },
                { icon: Send, title: 'Мягкая продажа', text: 'прогреть к продукту без давления' },
              ].map((idea) => (
                <button
                  key={idea.title}
                  onClick={() => onCreatePost(selectedBrand.id)}
                  className="text-left rounded-xl border border-slate-100 bg-white hover:bg-violet-50 hover:border-violet-200 p-3 transition-all group"
                >
                  <div className="flex items-center gap-2 text-xs font-black text-[#233137]">
                    <idea.icon size={13} className="text-[#9aaeb5] group-hover:text-violet-500" />
                    {idea.title}
                  </div>
                  <div className="text-[11px] text-[#758084] mt-1">{idea.text}</div>
                </button>
              ))}
            </div>
          </details>
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
              className="w-full p-10 border-2 border-dashed border-slate-200 rounded-2xl text-center hover:border-violet-300 hover:bg-violet-50/50 transition-all bg-white"
            >
              <Sparkles size={28} className="mx-auto text-violet-300 mb-3" />
              <div className="text-sm font-bold text-slate-600">Пока нет постов</div>
              <div className="text-xs text-slate-400 mt-1">Создайте первый черновик — я предложу структуру и текст</div>
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
              const preview    = post.text?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
                              || post.point?.trim()
                              || 'Пустой черновик';
              const shortPreview = preview.length > 72 ? `${preview.slice(0, 69).trim()}…` : preview;
              const isDeletable = post.status !== 'published';

              return (
                <div
                  key={post.id}
                  onClick={() => onSelectPost(post)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectPost(post);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100/60 cursor-pointer transition-all"
                >
                  <div className="relative h-28 bg-[#f8fafa]">
                    {post.imageUrl ? (
                      <img src={post.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${status.bg} ${status.color}`}>
                          <StatusIcon size={20} />
                        </div>
                      </div>
                    )}
                    <div className="absolute left-3 top-3 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${post.status === 'published' ? 'bg-slate-900 text-white' : 'bg-white/90 text-slate-700'}`}>
                        <StatusIcon size={10} />
                        {status.label}
                      </span>
                    </div>
                    <ArrowRight
                      size={15}
                      className={`absolute right-3 top-3 drop-shadow-sm transition-transform group-hover:translate-x-0.5 ${post.imageUrl ? 'text-white' : 'text-slate-300'}`}
                    />
                  </div>

                  <div className="p-3">
                    <div className="min-h-[42px] text-xs font-bold leading-relaxed text-slate-900 line-clamp-2">
                      {shortPreview}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {goal && (
                          <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${goal.cls}`}>
                            {goal.icon} {goal.label}
                          </span>
                        )}
                        {post.imageUrl && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-violet-100 bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">
                            <ImageIcon size={10} /> Медиа
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-[9px] text-slate-400">{relativeTime(post.updatedAt)}</span>
                    </div>
                  </div>

                  {isDeletable && (
                    <button
                      onClick={e => { e.stopPropagation(); onDeletePost(post.id); }}
                      className="absolute bottom-3 right-3 rounded-lg bg-white/90 p-1.5 text-slate-300 opacity-0 shadow-sm transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
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
