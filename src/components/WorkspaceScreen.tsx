import React, { useState } from 'react';
import {
  FileText, Radio, Plus, Clock, Check, Archive, ArrowRight,
  Settings, Trash2, ChevronRight, Loader2, RefreshCw,
  AlertTriangle, ChevronDown, Zap, TrendingUp, BookOpen, Megaphone,
  PenLine,
} from 'lucide-react';
import { Brand, PostProject, ChannelInfo, PostGoal } from '../../types';
import { analyzeChannelAction } from '@/app/actions/gemini';

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
  [PostGoal.SELL]:    { label: 'Продажа',    icon: <Zap size={10} />,        cls: 'bg-amber-50 text-amber-600 border-amber-100' },
  [PostGoal.ENGAGE]:  { label: 'Вовлечение', icon: <TrendingUp size={10} />, cls: 'bg-violet-50 text-violet-600 border-violet-100' },
  [PostGoal.EDUCATE]: { label: 'Обучение',   icon: <BookOpen size={10} />,   cls: 'bg-sky-50 text-sky-600 border-sky-100' },
  [PostGoal.INFORM]:  { label: 'Инфо',       icon: <Megaphone size={10} />,  cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
};

const statusConfig = {
  draft:     { icon: Clock,   color: 'text-amber-500',   bg: 'bg-amber-50',   label: 'Черновик'    },
  published: { icon: Check,   color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Опубликован' },
  archived:  { icon: Archive, color: 'text-slate-400',   bg: 'bg-slate-50',   label: 'Архив'       },
};

type TabFilter = 'all' | 'draft' | 'published';

// ─── props ────────────────────────────────────────────────────────────────────

interface WorkspaceScreenProps {
  brands: Brand[];
  posts: PostProject[];
  onSelectPost: (post: PostProject) => void;
  onCreatePost: (brandId: string) => void;
  onCreateBrand: () => void;
  onEditBrand: (brand: Brand) => void;
  onDeleteBrand: (brandId: string) => void;
  onDeletePost: (postId: string) => void;
  onOpenPositioning: (brand: Brand) => void;
  onAnalysisDone?: (brand: Brand, analysis: ChannelInfo) => void;
  loading?: boolean;
}

// ─── component ────────────────────────────────────────────────────────────────

export const WorkspaceScreen: React.FC<WorkspaceScreenProps> = ({
  brands, posts,
  onSelectPost, onCreatePost, onCreateBrand,
  onEditBrand, onDeleteBrand, onDeletePost,
  onOpenPositioning, onAnalysisDone,
}) => {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(
    brands.length > 0 ? brands[0].id : null,
  );
  const [confirmDeleteBrandId, setConfirmDeleteBrandId] = useState<string | null>(null);
  const [analyzingBrandId,     setAnalyzingBrandId]     = useState<string | null>(null);
  const [analysisOpenId,       setAnalysisOpenId]       = useState<string | null>(null);
  const [tabFilter,            setTabFilter]            = useState<TabFilter>('all');

  const selectedBrand = brands.find(b => b.id === selectedBrandId) ?? null;

  // Posts for the selected brand, filtered by tab
  const brandPosts = selectedBrandId
    ? posts.filter(p => p.brandId === selectedBrandId)
    : posts;

  const filteredPosts = brandPosts.filter(p => {
    if (tabFilter === 'draft')     return p.status !== 'published';
    if (tabFilter === 'published') return p.status === 'published';
    return true;
  });

  const draftCount     = brandPosts.filter(p => p.status !== 'published').length;
  const publishedCount = brandPosts.filter(p => p.status === 'published').length;

  // ── handlers ──────────────────────────────────────────────────────────────

  const handleAnalyze = async (brand: Brand) => {
    if (!brand.channelUrl) return;
    setAnalyzingBrandId(brand.id);
    setAnalysisOpenId(brand.id);
    try {
      const { info } = await analyzeChannelAction(brand.channelUrl);
      onAnalysisDone?.(brand, info);
    } catch (e) { console.error(e); }
    finally { setAnalyzingBrandId(null); }
  };

  const handleBrandClick = (brandId: string) => {
    if (confirmDeleteBrandId) return;
    setSelectedBrandId(brandId);
    setTabFilter('all');
  };

  const draftCountForBrand = (brandId: string) =>
    posts.filter(p => p.brandId === brandId && p.status !== 'published').length;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50 p-4 sm:p-6 font-sans custom-scrollbar">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-display font-black text-slate-900">Рабочее пространство</h1>
          <p className="text-slate-500 text-sm mt-1">Управляй источниками и постами</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* ═══════════════ ИСТОЧНИКИ (левая колонка) ═══════════════ */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Radio size={13} /> Источники
              </h2>
              <button
                onClick={onCreateBrand}
                className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1"
              >
                <Plus size={12} /> Добавить
              </button>
            </div>

            <div className="space-y-2">
              {brands.map(brand => {
                const isSelected   = selectedBrandId === brand.id;
                const isConfirming = confirmDeleteBrandId === brand.id;
                const isAnalysisOpen = analysisOpenId === brand.id;
                const hasAnalysis  = !!brand.analyzedChannel;
                const drafts       = draftCountForBrand(brand.id);

                return (
                  <div
                    key={brand.id}
                    className={`rounded-2xl border transition-all overflow-hidden group ${
                      isSelected
                        ? 'bg-white border-violet-300 ring-4 ring-violet-50 shadow-xl shadow-violet-100/50'
                        : 'bg-white border-slate-200 hover:border-violet-200 hover:shadow-md cursor-pointer'
                    }`}
                    onClick={() => !isConfirming && handleBrandClick(brand.id)}
                  >
                    {/* Brand header row */}
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          isSelected ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {brand.name[0]}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-sm truncate ${isSelected ? 'text-violet-900' : 'text-slate-900'}`}>
                            {brand.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {hasAnalysis && (
                              <span className="text-[9px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-full font-bold border border-violet-100">
                                Изучен ✓
                              </span>
                            )}
                            {brand.linkedChannel && (
                              <span className="text-[9px] bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded-full font-bold border border-sky-100">
                                Подключён
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Hover actions */}
                        {!isConfirming && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={e => { e.stopPropagation(); onEditBrand(brand); }}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                              title="Настройки"
                            >
                              <Settings size={13} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setConfirmDeleteBrandId(brand.id); }}
                              className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                              title="Удалить"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Analysis toggle row (visible when selected) */}
                      {isSelected && (
                        <div className="mt-3 flex items-center justify-between">
                          <button
                            onClick={e => { e.stopPropagation(); setAnalysisOpenId(isAnalysisOpen ? null : brand.id); }}
                            className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-violet-600 transition-colors"
                          >
                            <ChevronDown size={12} className={`transition-transform ${isAnalysisOpen ? 'rotate-180' : ''}`} />
                            {hasAnalysis ? 'Анализ канала' : 'Изучить канал'}
                          </button>
                          {hasAnalysis && (
                            <button
                              onClick={e => { e.stopPropagation(); handleAnalyze(brand); }}
                              disabled={analyzingBrandId === brand.id}
                              className="flex items-center gap-1 text-[9px] font-bold text-slate-300 hover:text-violet-500 disabled:opacity-40 transition-colors"
                            >
                              {analyzingBrandId === brand.id
                                ? <Loader2 size={10} className="animate-spin" />
                                : <RefreshCw size={10} />}
                              Обновить
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ── Inline delete confirmation ── */}
                    {isConfirming && (
                      <div
                        className="mx-4 mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-start gap-2 mb-3">
                          <AlertTriangle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-rose-700">Удалить «{brand.name}»?</p>
                            {drafts > 0 && (
                              <p className="text-[10px] text-rose-500 mt-0.5">
                                {drafts}&nbsp;{drafts === 1 ? 'черновик' : drafts < 5 ? 'черновика' : 'черновиков'} тоже удалятся
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={e => { e.stopPropagation(); setConfirmDeleteBrandId(null); }}
                            className="flex-1 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            Отмена
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setConfirmDeleteBrandId(null);
                              if (selectedBrandId === brand.id) setSelectedBrandId(null);
                              onDeleteBrand(brand.id);
                            }}
                            className="flex-1 py-1.5 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── Collapsible analysis panel ── */}
                    {isSelected && isAnalysisOpen && !isConfirming && (
                      <div className="mx-4 mb-4 bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2.5">
                        {analyzingBrandId === brand.id ? (
                          <div className="flex items-center gap-2 py-2 justify-center">
                            <Loader2 size={14} className="animate-spin text-violet-400" />
                            <span className="text-xs text-slate-400">Изучаю канал...</span>
                          </div>
                        ) : hasAnalysis ? (
                          <>
                            {brand.analyzedChannel!.topic && (
                              <div>
                                <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Тематика</div>
                                <p className="text-[10px] text-slate-700 font-medium leading-relaxed">{brand.analyzedChannel!.topic}</p>
                              </div>
                            )}
                            {(brand.analyzedChannel!.contentPillars?.length ?? 0) > 0 && (
                              <div>
                                <div className="text-[8px] font-black uppercase tracking-widest text-violet-400 mb-1">Темы</div>
                                <div className="flex flex-wrap gap-1">
                                  {brand.analyzedChannel!.contentPillars!.map(p => (
                                    <span key={p} className="text-[9px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded-full font-medium">{p}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {brand.analyzedChannel!.toneOfVoice && (
                              <div>
                                <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Стиль</div>
                                <p className="text-[10px] text-slate-600 leading-relaxed">{brand.analyzedChannel!.toneOfVoice}</p>
                              </div>
                            )}
                            {(brand.analyzedChannel!.forbiddenPhrases?.length ?? 0) > 0 && (
                              <div>
                                <div className="text-[8px] font-black uppercase tracking-widest text-rose-400 mb-1">Избегать</div>
                                <div className="flex flex-wrap gap-1">
                                  {brand.analyzedChannel!.forbiddenPhrases!.map(p => (
                                    <span key={p} className="text-[9px] bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded-full font-medium">{p}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {selectedBrand?.positioning && (
                              <div className="pt-1 border-t border-slate-200">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Заметки</div>
                                  <button onClick={() => onOpenPositioning(brand)} className="text-[9px] text-violet-500 font-bold hover:underline">Изменить</button>
                                </div>
                                <p className="text-[10px] text-slate-500 italic leading-relaxed">{selectedBrand.positioning}</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-3">
                            <p className="text-xs text-slate-400 mb-2">Канал ещё не изучен</p>
                            <button
                              onClick={e => { e.stopPropagation(); handleAnalyze(brand); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[10px] font-bold transition-all"
                            >
                              <Radio size={11} /> Изучить
                            </button>
                            <p className="text-[9px] text-slate-300 mt-2">Не нужен доступ администратора</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {brands.length === 0 && (
                <button
                  onClick={onCreateBrand}
                  className="w-full p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center hover:border-violet-300 hover:bg-violet-50/50 transition-all"
                >
                  <Radio size={24} className="mx-auto text-slate-300 mb-2" />
                  <div className="text-sm font-medium text-slate-500">Добавь первый канал</div>
                  <div className="text-xs text-slate-400 mt-1">Проанализируем стиль и тематику</div>
                </button>
              )}
            </div>
          </div>

          {/* ═══════════════ ПОСТЫ (правая колонка) ═══════════════ */}
          <div className="lg:col-span-2 space-y-4">

            {selectedBrand ? (
              <>
                {/* ── Header row: brand name + CTA ── */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-slate-900">{selectedBrand.name}</h2>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {draftCount > 0 && (
                        <span className="text-amber-500 font-bold">
                          {draftCount}&nbsp;{draftCount === 1 ? 'черновик' : draftCount < 5 ? 'черновика' : 'черновиков'}
                        </span>
                      )}
                      {draftCount > 0 && publishedCount > 0 && <span className="text-slate-300"> · </span>}
                      {publishedCount > 0 && (
                        <span className="text-emerald-500 font-bold">
                          {publishedCount}&nbsp;{publishedCount === 1 ? 'пост опубликован' : publishedCount < 5 ? 'поста опубликовано' : 'постов опубликовано'}
                        </span>
                      )}
                      {draftCount === 0 && publishedCount === 0 && (
                        <span className="text-slate-400">Нет постов</span>
                      )}
                    </p>
                  </div>

                  {/* Primary CTA */}
                  <button
                    onClick={() => onCreatePost(selectedBrand.id)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 active:scale-95"
                  >
                    <PenLine size={13} />
                    Написать пост
                  </button>
                </div>

                {/* ── Status tabs ── */}
                {brandPosts.length > 0 && (
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                    {([
                      { id: 'all'       as TabFilter, label: 'Все',           count: brandPosts.length },
                      { id: 'draft'     as TabFilter, label: 'Черновики',     count: draftCount },
                      { id: 'published' as TabFilter, label: 'Опубликованные', count: publishedCount },
                    ] as const).map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setTabFilter(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                          tabFilter === tab.id
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {tab.label}
                        <span className={`text-[9px] font-black px-1 py-0.5 rounded-full min-w-[16px] text-center ${
                          tabFilter === tab.id ? 'bg-violet-100 text-violet-600' : 'bg-slate-200 text-slate-400'
                        }`}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Post grid ── */}
                {filteredPosts.length === 0 ? (
                  tabFilter === 'all' ? (
                    <button
                      onClick={() => onCreatePost(selectedBrand.id)}
                      className="w-full p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center hover:border-violet-300 hover:bg-violet-50/50 transition-all"
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                          {/* Status icon + text preview */}
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

                          {/* Meta row: goal badge + time */}
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

                          {/* Continue arrow */}
                          <ArrowRight
                            size={14}
                            className="absolute top-4 right-4 text-slate-200 group-hover:text-violet-400 transition-colors"
                          />

                          {/* Delete button (drafts/archived only) */}
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
              </>
            ) : (
              /* No brand selected */
              <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                {brands.length > 0 ? (
                  <>
                    <ChevronRight size={32} className="text-slate-300 mb-3 rotate-180" />
                    <div className="text-sm font-medium text-slate-500">Выбери источник слева</div>
                  </>
                ) : (
                  <>
                    <Radio size={40} className="text-slate-200 mb-4" />
                    <div className="text-base font-bold text-slate-400 mb-1">Нет источников</div>
                    <div className="text-sm text-slate-400 mb-4">Добавь первый Telegram-канал</div>
                    <button
                      onClick={onCreateBrand}
                      className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-violet-500/20"
                    >
                      <Plus size={15} /> Добавить канал
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

        </div>

        <div className="mt-12 pb-4 text-center">
          <a href="https://t.me/sphera_spb" target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-slate-400 hover:text-violet-600 font-medium transition-colors">
            При поддержке Сферы
          </a>
        </div>
      </div>
    </div>
  );
};
