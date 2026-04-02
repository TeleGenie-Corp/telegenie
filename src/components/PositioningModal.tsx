import React, { useState, useEffect } from 'react';
import { X, Sparkles, Wand2, Loader2, Target, RefreshCw, Save } from 'lucide-react';
import { analyzeChannelAction } from '@/app/actions/gemini';
import { ChannelInfo } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface PositioningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (positioning: string) => void;
  channelInfo?: ChannelInfo;
  currentPositioning?: string;
  channelUrl?: string;
  onAnalysisUpdate?: (analysis: ChannelInfo) => void;
}

export const PositioningModal: React.FC<PositioningModalProps> = ({
  isOpen, onClose, onSave, channelInfo, currentPositioning, channelUrl, onAnalysisUpdate
}) => {
  const [positioning, setPositioning] = useState(currentPositioning || '');
  const [localAnalysis, setLocalAnalysis] = useState<ChannelInfo | undefined>(channelInfo);
  const [reanalyzing, setReanalyzing] = useState(false);

  // Sync when props change (e.g. brand switch)
  useEffect(() => {
    setPositioning(currentPositioning || '');
    setLocalAnalysis(channelInfo);
  }, [isOpen, currentPositioning, channelInfo]);

  const handleReanalyze = async () => {
    if (!channelUrl) return;
    setReanalyzing(true);
    try {
      const { info } = await analyzeChannelAction(channelUrl);
      setLocalAnalysis(info);
      onAnalysisUpdate?.(info);
    } catch (e) {
      console.error(e);
    } finally {
      setReanalyzing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg md:max-w-xl p-6 md:p-8 relative max-h-[90vh] overflow-hidden flex flex-col"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-display font-black text-slate-900 mb-1 flex items-center gap-2">
              <Sparkles className="text-violet-600" size={20} />
              Профиль канала
            </h2>
            <p className="text-slate-500 text-sm mb-5">
              Что ИИ знает о канале — используется при каждой генерации.
            </p>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">

              {/* === Channel Analysis Card === */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-violet-600">
                    <Target size={11} /> Анализ канала
                  </div>
                  {channelUrl && (
                    <button
                      onClick={handleReanalyze}
                      disabled={reanalyzing}
                      className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-violet-600 disabled:opacity-40 transition-colors"
                    >
                      {reanalyzing
                        ? <Loader2 className="animate-spin" size={11} />
                        : <RefreshCw size={11} />}
                      {reanalyzing ? 'Обновляю...' : 'Обновить'}
                    </button>
                  )}
                </div>

                {localAnalysis ? (
                  <>
                    {localAnalysis.topic && (
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Тематика</div>
                        <p className="text-xs text-slate-700 font-medium">{localAnalysis.topic}</p>
                      </div>
                    )}

                    {(localAnalysis.contentPillars?.length ?? 0) > 0 && (
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-violet-400 mb-1.5">Темы контента</div>
                        <div className="flex flex-wrap gap-1">
                          {localAnalysis.contentPillars!.map(p => (
                            <span key={p} className="text-[10px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-medium">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {localAnalysis.toneOfVoice && (
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Стиль и голос</div>
                        <p className="text-xs text-slate-600 leading-relaxed">{localAnalysis.toneOfVoice}</p>
                      </div>
                    )}

                    {(localAnalysis.forbiddenPhrases?.length ?? 0) > 0 && (
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-rose-400 mb-1.5">Чего избегать</div>
                        <div className="flex flex-wrap gap-1">
                          {localAnalysis.forbiddenPhrases!.map(p => (
                            <span key={p} className="text-[10px] bg-rose-50 text-rose-500 px-2 py-0.5 rounded-full font-medium">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-3 py-2">
                    {reanalyzing ? (
                      <>
                        <Loader2 className="animate-spin text-violet-400 shrink-0" size={16} />
                        <p className="text-xs text-slate-400">Изучаю канал...</p>
                      </>
                    ) : (
                      <>
                        <Target className="text-slate-300 shrink-0" size={16} />
                        <p className="text-xs text-slate-400">
                          Анализ появится автоматически при первой генерации поста.
                          {channelUrl && (
                            <button
                              onClick={handleReanalyze}
                              className="ml-1 text-violet-500 font-bold hover:text-violet-700"
                            >
                              Запустить сейчас
                            </button>
                          )}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* === Positioning Text === */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                  Позиционирование <span className="font-normal normal-case tracking-normal text-slate-300">(необязательно)</span>
                </label>
                <textarea
                  value={positioning}
                  onChange={e => setPositioning(e.target.value)}
                  placeholder="Опционально: опиши своим словами, для кого канал, что даёт аудитории, чем отличается от других. ИИ учтёт это при генерации."
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:border-violet-300 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none resize-none placeholder:text-slate-300 leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-5 mt-3 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 px-4 py-2.5 font-bold text-sm transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => { onSave(positioning); onClose(); }}
                className="flex items-center gap-2 bg-slate-900 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-200 active:scale-95"
              >
                <Save size={15} />
                Сохранить
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
