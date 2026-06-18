import React, { useState } from 'react';
import {
  Plus, Clock, Check, Archive, ArrowRight,
  Trash2,
  Zap, TrendingUp, BookOpen, Megaphone,
  PenLine, Radio, Sparkles, Image as ImageIcon, Send, MessageSquareText,
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

function postPreview(post: PostProject, maxLength = 72): string {
  const preview = post.text?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
               || post.point?.trim()
               || 'Пустой черновик';

  return preview.length > maxLength ? `${preview.slice(0, maxLength - 1).trim()}…` : preview;
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
  const [tabFilter, setTabFilter] = useState<TabFilter>('draft');
  const [showAllPosts, setShowAllPosts] = useState(false);

  const brandPosts = selectedBrand
    ? posts.filter(p => p.brandId === selectedBrand.id)
    : [];

  const activeBrandPosts = brandPosts.filter(p => p.status !== 'archived');
  const draftPosts = activeBrandPosts
    .filter(p => p.status === 'draft')
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const publishedPosts = activeBrandPosts.filter(p => p.status === 'published');
  const draftCount     = draftPosts.length;
  const publishedCount = publishedPosts.length;
  const archivedCount  = brandPosts.length - activeBrandPosts.length;
  const effectiveTabFilter = tabFilter === 'draft' && draftCount === 0 ? 'all' : tabFilter;
  const filteredPosts = activeBrandPosts.filter(p => {
    if (effectiveTabFilter === 'draft')     return p.status === 'draft';
    if (effectiveTabFilter === 'published') return p.status === 'published';
    return true;
  });
  const mediaDraftCount = draftPosts.filter(p => !!p.imageUrl).length;
  const staleDraftCount = draftPosts.filter(p => Date.now() - p.updatedAt > 7 * DAY_MS).length;
  const analyzedTone = selectedBrand?.analyzedChannel?.toneOfVoice || selectedBrand?.analyzedChannel?.context;
  const analyzedTopic = selectedBrand?.analyzedChannel?.topic || selectedBrand?.analyzedChannel?.description;
  const contentPillars = selectedBrand?.analyzedChannel?.contentPillars?.slice(0, 4) || [];
  const forbiddenPhrases = selectedBrand?.analyzedChannel?.forbiddenPhrases?.slice(0, 3) || [];
  const hasBrandVoice = !!(analyzedTone || analyzedTopic || contentPillars.length || selectedBrand?.positioning);
  const nextDraft = draftPosts[0];
  const queuePosts = effectiveTabFilter === 'draft' && nextDraft
    ? filteredPosts.filter(p => p.id !== nextDraft.id)
    : filteredPosts;
  const visiblePosts = showAllPosts ? queuePosts : queuePosts.slice(0, 6);
  const hiddenPostCount = queuePosts.length - visiblePosts.length;
  const latestPublished = publishedPosts
    .sort((a, b) => (b.publishedAt || b.updatedAt) - (a.publishedAt || a.updatedAt))[0];
  const pulseMetrics = [
    { label: 'Черновики', value: draftCount, hint: nextDraft ? relativeTime(nextDraft.updatedAt) : 'нет хвостов' },
    { label: 'С медиа', value: mediaDraftCount, hint: mediaDraftCount ? 'черновики с визуалом' : 'без медиа' },
    { label: 'Опубликовано', value: publishedCount, hint: latestPublished ? relativeTime(latestPublished.publishedAt || latestPublished.updatedAt) : 'пока пусто' },
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
        <div>
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
              {archivedCount > 0 && (draftCount > 0 || publishedCount > 0) && <span className="text-stone-300"> · </span>}
              {archivedCount > 0 && (
                <span className="text-stone-400 font-bold">
                  {archivedCount}&nbsp;в архиве
                </span>
              )}
              {draftCount === 0 && publishedCount === 0 && archivedCount === 0 && (
                <span>Нет постов</span>
              )}
            </p>
          </div>
        </div>

        {/* Today's focus */}
        <div className="overflow-hidden rounded-2xl border border-[#dfe6e6] bg-[#233137] text-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
            <div className="p-5">
              <div className="text-[10px] font-black uppercase tracking-widest text-white/45">Сегодняшний фокус</div>
              <h3 className="mt-2 max-w-2xl text-2xl font-black leading-tight tracking-tight">
                {nextDraft ? postPreview(nextDraft, 94) : 'Начните один пост, а TeleGenie соберёт структуру дальше'}
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65">
                {staleDraftCount > 0
                  ? `${staleDraftCount} старых черновиков создают шум. Начните с самого свежего и решите: дописать или убрать.`
                  : nextDraft
                    ? 'Это ближайшая точка продолжения: один черновик, одно действие, без выбора из всего списка.'
                    : 'Пока нет черновиков. Достаточно одной мысли — дальше появится очередь и фокус дня.'}
              </p>

              <button
                onClick={() => nextDraft ? onSelectPost(nextDraft) : onCreatePost(selectedBrand.id)}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-[#233137] transition-all hover:bg-violet-50 active:scale-95"
              >
                {nextDraft ? 'Открыть и дописать' : 'Начать пост'}
                <ArrowRight size={14} />
              </button>

              <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
                {pulseMetrics.map((metric) => (
                  <div key={metric.label} className="min-w-0 px-2 py-1.5">
                    <div className="truncate text-[10px] font-bold uppercase tracking-wider text-white/40">{metric.label}</div>
                    <div className="mt-0.5 text-lg font-black text-white">{metric.value}</div>
                    <div className="truncate text-[10px] text-white/45">{metric.hint}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 bg-white/[0.04] p-4 lg:border-l lg:border-t-0">
              <div className="relative h-full min-h-56 overflow-hidden rounded-xl bg-white/8">
                {nextDraft?.imageUrl ? (
                  <img src={nextDraft.imageUrl} alt="" className="h-full min-h-56 w-full object-cover" />
                ) : (
                  <div className="flex h-full min-h-56 items-center justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-white/55">
                      <PenLine size={30} />
                    </div>
                  </div>
                )}
                <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#233137]">
                  {nextDraft ? 'Черновик' : 'Новый пост'}
                </div>
                {nextDraft && (
                  <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-[#233137]/85 p-3 backdrop-blur">
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/45">Последнее касание</div>
                    <div className="mt-1 text-sm font-black">{relativeTime(nextDraft.updatedAt)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Brand voice */}
        <div className="rounded-2xl border border-[#e4eaea] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-violet-500">
                <MessageSquareText size={12} />
                Голос бренда
              </div>
              <div className="mt-2 text-sm font-black text-[#233137]">
                {hasBrandVoice ? (selectedBrand.analyzedChannel?.name || selectedBrand.name) : 'Канал ещё не изучен'}
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#758084]">
                {analyzedTone
                  ? analyzedTone
                  : 'После анализа здесь появится тон, темы и ограничения, которые TeleGenie учитывает при генерации.'}
              </p>
            </div>

            {analyzedTopic && (
              <div className="shrink-0 rounded-xl bg-[#f8fafa] px-3 py-2 text-right sm:max-w-52">
                <div className="text-[9px] font-black uppercase tracking-widest text-[#9aaeb5]">Тематика</div>
                <div className="mt-1 text-xs font-bold leading-snug text-[#233137]">{analyzedTopic}</div>
              </div>
            )}
          </div>

          {(contentPillars.length > 0 || forbiddenPhrases.length > 0 || selectedBrand.positioning) && (
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.8fr]">
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest text-[#9aaeb5]">Контентные опоры</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {contentPillars.length > 0 ? contentPillars.map(pillar => (
                    <span key={pillar} className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">
                      {pillar}
                    </span>
                  )) : (
                    <span className="text-xs text-[#9aaeb5]">Пока не определены</span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {selectedBrand.positioning && (
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-[#9aaeb5]">Позиционирование</div>
                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-[#758084]">{selectedBrand.positioning}</p>
                  </div>
                )}
                {forbiddenPhrases.length > 0 && (
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-rose-400">Избегать</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {forbiddenPhrases.map(phrase => (
                        <span key={phrase} className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-500">
                          {phrase}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Secondary actions */}
        <details className="group rounded-2xl border border-[#e8e8e8] bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[11px] font-bold text-slate-500">
            <span className="inline-flex items-center gap-2">
              <Sparkles size={12} className="text-violet-500" />
              Ещё варианты
            </span>
            <span className="text-slate-300 transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="hidden border-t border-slate-100 px-4 pb-4 pt-3 group-open:block">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="text-xs font-black text-[#233137]">
                  {analyzedTone ? 'Голос канала учтён' : 'Канал ещё стоит изучить'}
                </div>
                <div className="mt-0.5 text-xs text-[#758084]">
                  {analyzedTone
                    ? 'Можно начать новый пост или взять один из простых сценариев.'
                    : 'После анализа TeleGenie будет точнее держать авторский стиль.'}
                </div>
              </div>
              <button
                onClick={() => onCreatePost(selectedBrand.id)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-violet-700 active:scale-95"
              >
                <PenLine size={13} />
                Написать новый
              </button>
            </div>

            <div className="mt-3 rounded-xl border border-slate-100 bg-[#f8fafa]">
              <div className="flex items-center justify-between px-3 py-2 text-[11px] font-bold text-slate-500">
                <span>Шаблоны для старта</span>
              </div>
              <div className="grid grid-cols-1 gap-2 px-3 pb-3 sm:grid-cols-3">
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
            </div>
          </div>
        </details>

        {activeBrandPosts.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-[#9aaeb5]">Очередь</div>
              <div className="mt-0.5 text-sm font-black text-[#233137]">
                {effectiveTabFilter === 'draft'
                  ? `${queuePosts.length} ${queuePosts.length === 1 ? 'черновик ждёт' : queuePosts.length < 5 ? 'черновика ждут' : 'черновиков ждут'} после фокуса`
                  : effectiveTabFilter === 'published'
                    ? 'Архив выпущенных постов'
                    : 'Все материалы канала'}
              </div>
            </div>
          </div>
        )}

        {/* Tab filter */}
        {activeBrandPosts.length > 0 && (
          <div className="flex gap-1 bg-white border border-stone-200 p-1 rounded-xl w-fit shadow-sm">
            {([
              { id: 'all'       as TabFilter, label: 'Все',            count: activeBrandPosts.length },
              { id: 'draft'     as TabFilter, label: 'Черновики',      count: draftCount },
              { id: 'published' as TabFilter, label: 'Опубликованные', count: publishedCount },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setTabFilter(tab.id);
                  setShowAllPosts(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  effectiveTabFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                <span className={`text-[9px] font-black px-1 py-0.5 rounded-full min-w-[16px] text-center ${
                  effectiveTabFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Post grid */}
        {filteredPosts.length === 0 ? (
          effectiveTabFilter === 'all' ? (
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
                {effectiveTabFilter === 'draft' ? 'Нет черновиков' : 'Нет опубликованных постов'}
              </div>
            </div>
          )
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {visiblePosts.map(post => {
              const status     = statusConfig[post.status];
              const StatusIcon = status.icon;
              const goal       = post.goal ? goalMeta[post.goal] : null;
              const shortPreview = postPreview(post);
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
            {hiddenPostCount > 0 && (
              <button
                onClick={() => setShowAllPosts(true)}
                className="mx-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 transition-all hover:border-violet-200 hover:text-violet-600"
              >
                Показать ещё {hiddenPostCount}
                <ArrowRight size={13} />
              </button>
            )}
          </>
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
