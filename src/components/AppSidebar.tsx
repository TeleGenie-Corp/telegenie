'use client';

import React, { useState } from 'react';
import {
  Plus, Radio, Settings, Trash2, LogOut, UserCircle,
  Sparkles, AlertTriangle, Loader2, ChevronDown, RefreshCw,
} from 'lucide-react';
import { Brand, User, UserProfile, ChannelInfo } from '../../types';
import { analyzeChannelAction } from '@/app/actions/gemini';

interface AppSidebarProps {
  viewMode: 'workspace' | 'editor';
  brands: Brand[];
  currentBrand: Brand | null;
  user: User | null;
  profile: UserProfile | null;
  /** Channel context from editorStore (editor mode) */
  editorAnalyzedChannel?: ChannelInfo;
  onSelectBrand: (brand: Brand) => void;
  onCreateBrand: () => void;
  onEditBrand: (brand: Brand) => void;
  onDeleteBrand: (brandId: string) => void;
  onAnalysisDone?: (brand: Brand, analysis: ChannelInfo) => void;
  onLogout: () => void;
  onOpenSubscription: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  viewMode, brands, currentBrand, user, profile, editorAnalyzedChannel,
  onSelectBrand, onCreateBrand, onEditBrand, onDeleteBrand, onAnalysisDone,
  onLogout, onOpenSubscription,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(true);

  const displayName =
    profile?.telegram?.first_name ||
    (user?.first_name && user.first_name !== 'User' ? user.first_name : null) ||
    profile?.email ||
    user?.email ||
    'User';

  const handleAnalyze = async (brand: Brand) => {
    if (!brand.channelUrl) return;
    setAnalyzingId(brand.id);
    try {
      const { info } = await analyzeChannelAction(brand.channelUrl);
      onAnalysisDone?.(brand, info);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzingId(null);
    }
  };

  // In editor mode show the editor's analyzed channel; in workspace show selected brand's analysis
  const channelCtx =
    viewMode === 'editor'
      ? editorAnalyzedChannel
      : currentBrand?.analyzedChannel;

  const hasContext =
    channelCtx &&
    (channelCtx.contentPillars?.length || channelCtx.toneOfVoice || channelCtx.forbiddenPhrases?.length);

  return (
    <aside className="w-56 bg-white border-r border-slate-100 flex flex-col h-full shrink-0 overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-3 flex items-center gap-2.5">
        <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-[10px] shrink-0">
          TG
        </div>
        <span className="font-display font-bold text-sm text-slate-900">TeleGenie</span>
      </div>

      {/* Sources label */}
      <div className="flex items-center justify-between px-4 py-1.5">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <Radio size={10} /> Источники
        </span>
        <button
          onClick={onCreateBrand}
          className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
          title="Добавить источник"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Brands list + channel context — scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 px-2 pb-2 space-y-0.5">
        {brands.length === 0 ? (
          <button
            onClick={onCreateBrand}
            className="w-full p-4 border-2 border-dashed border-slate-200 rounded-xl text-center hover:border-violet-300 hover:bg-violet-50/50 transition-all mt-1"
          >
            <Radio size={18} className="mx-auto text-slate-300 mb-1.5" />
            <div className="text-[10px] font-medium text-slate-400">Добавь канал</div>
          </button>
        ) : (
          brands.map(brand => {
            const isSelected = currentBrand?.id === brand.id;
            const isConfirming = confirmDeleteId === brand.id;
            const isAnalyzing = analyzingId === brand.id;
            const hasAnalysis = !!brand.analyzedChannel;
            const isLinked = !!brand.linkedChannel;

            return (
              <div
                key={brand.id}
                className={`rounded-xl overflow-hidden transition-all ${isSelected ? 'bg-violet-50' : ''}`}
              >
                {/* Brand row */}
                <div
                  className={`flex items-center gap-2 px-2 py-2 rounded-xl cursor-pointer group transition-colors ${
                    isSelected ? 'text-violet-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => !isConfirming && onSelectBrand(brand)}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {brand.name[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{brand.name}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {hasAnalysis && (
                        <span className="text-[8px] text-violet-500 font-bold">Изучен ✓</span>
                      )}
                      {isLinked && (
                        <span className="text-[8px] text-sky-500 font-bold">· Подключён</span>
                      )}
                    </div>
                  </div>

                  {/* Hover action buttons */}
                  {!isConfirming && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {hasAnalysis && (
                        <button
                          onClick={e => { e.stopPropagation(); handleAnalyze(brand); }}
                          disabled={isAnalyzing}
                          className="p-1 hover:bg-white hover:shadow-sm rounded-md text-slate-300 hover:text-violet-500 transition-all disabled:opacity-40"
                          title="Обновить анализ"
                        >
                          {isAnalyzing ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); onEditBrand(brand); }}
                        className="p-1 hover:bg-white hover:shadow-sm rounded-md text-slate-400 hover:text-slate-600 transition-all"
                        title="Настройки"
                      >
                        <Settings size={11} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(brand.id); }}
                        className="p-1 hover:bg-red-50 rounded-md text-slate-400 hover:text-rose-500 transition-all"
                        title="Удалить"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Analyze CTA for unanalyzed selected brand */}
                {isSelected && !hasAnalysis && !isConfirming && (
                  <div className="px-2 pb-2">
                    <button
                      onClick={() => handleAnalyze(brand)}
                      disabled={isAnalyzing}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[10px] font-bold transition-all disabled:opacity-60"
                    >
                      {isAnalyzing ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <Radio size={10} />
                      )}
                      {isAnalyzing ? 'Изучаю...' : 'Изучить канал'}
                    </button>
                  </div>
                )}

                {/* Delete confirmation */}
                {isConfirming && (
                  <div className="px-2 pb-2" onClick={e => e.stopPropagation()}>
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-2.5">
                      <p className="text-[10px] font-bold text-rose-700 mb-2 flex items-center gap-1">
                        <AlertTriangle size={10} /> Удалить «{brand.name}»?
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="flex-1 py-1 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={() => {
                            setConfirmDeleteId(null);
                            onDeleteBrand(brand.id);
                          }}
                          className="flex-1 py-1 text-[10px] font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Channel context panel */}
        {hasContext && (
          <div className="mt-3 pt-2 border-t border-slate-100">
            <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50/50 border border-violet-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setInsightsOpen(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-[9px] font-black uppercase tracking-widest text-violet-600 hover:bg-violet-50/80 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles size={9} /> Контекст
                </span>
                <ChevronDown
                  size={10}
                  className={`transition-transform duration-200 ${insightsOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {insightsOpen && (
                <div className="px-3 pb-3 space-y-2">
                  {(channelCtx!.contentPillars?.length ?? 0) > 0 && (
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-widest text-violet-400 mb-1">Темы</div>
                      <div className="flex flex-wrap gap-1">
                        {channelCtx!.contentPillars!.map(p => (
                          <span key={p} className="text-[9px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-medium">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {channelCtx!.toneOfVoice && (
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-widest text-fuchsia-400 mb-0.5">Тон</div>
                      <p className="text-[9px] text-slate-600 leading-relaxed font-medium line-clamp-4">
                        {channelCtx!.toneOfVoice}
                      </p>
                    </div>
                  )}
                  {(channelCtx!.forbiddenPhrases?.length ?? 0) > 0 && (
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-widest text-rose-400 mb-1">Избегать</div>
                      <div className="flex flex-wrap gap-1">
                        {channelCtx!.forbiddenPhrases!.map(p => (
                          <span key={p} className="text-[9px] bg-rose-50 text-rose-400 px-1.5 py-0.5 rounded-full font-medium">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom: user info */}
      <div className="p-3 border-t border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} className="w-full h-full object-cover" alt="avatar" />
            ) : (
              <UserCircle className="w-full h-full p-1 text-slate-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-slate-900 truncate">{displayName}</div>
            <button
              onClick={onOpenSubscription}
              className="text-[9px] uppercase font-bold text-slate-400 hover:text-violet-600 tracking-wider transition-colors"
            >
              {profile?.subscription?.tier || 'FREE'}
            </button>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors shrink-0"
            title="Выйти"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
};
