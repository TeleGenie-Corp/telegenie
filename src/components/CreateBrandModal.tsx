import React, { useState } from 'react';
import { X, Radio, Link, Loader2, Sparkles, Target, CheckCircle2, RefreshCw } from 'lucide-react';
import { ChannelInfo } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeChannelAction } from '@/app/actions/gemini';

interface CreateBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; channelUrl: string }) => Promise<void>;
  onAnalysisDone?: (channelUrl: string, analysis: ChannelInfo) => void;
}

type Step = 'form' | 'analyzing' | 'result';

export const CreateBrandModal: React.FC<CreateBrandModalProps> = ({
  isOpen, onClose, onSave, onAnalysisDone
}) => {
  const [name, setName] = useState('');
  const [channelUrl, setChannelUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [analysis, setAnalysis] = useState<ChannelInfo | null>(null);
  const [analyzeError, setAnalyzeError] = useState('');

  const reset = () => {
    setName('');
    setChannelUrl('');
    setSaving(false);
    setError('');
    setStep('form');
    setAnalysis(null);
    setAnalyzeError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const runAnalysis = async (url: string) => {
    setStep('analyzing');
    setAnalyzeError('');
    try {
      const { info } = await analyzeChannelAction(url);
      setAnalysis(info);
      setStep('result');
      onAnalysisDone?.(url, info);
    } catch (e: any) {
      setAnalyzeError(e.message || 'Не удалось проанализировать канал');
      setStep('result');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !channelUrl.trim()) { setError('Заполни все поля'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({ name: name.trim(), channelUrl: channelUrl.trim() });
      await runAnalysis(channelUrl.trim());
    } catch (err: any) {
      setError(err.message || 'Ошибка создания');
      setSaving(false);
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
            onClick={step === 'result' ? handleClose : undefined}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md p-6 sm:p-8 relative"
          >
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <X size={20} />
            </button>

            {/* === STEP 1: FORM === */}
            {step === 'form' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-xl font-display font-black text-slate-900 mb-1 flex items-center gap-2">
                  <Radio className="text-violet-600" size={22} />
                  Новый источник
                </h2>
                <p className="text-slate-500 text-sm mb-6">
                  ИИ изучит канал и адаптирует контент под его стиль.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                      Название
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Мой канал, Бизнес-блог..."
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                      <Link size={12} className="inline mr-1" /> Ссылка на канал
                    </label>
                    <input
                      type="text"
                      value={channelUrl}
                      onChange={e => setChannelUrl(e.target.value)}
                      placeholder="https://t.me/mychannel"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {error && <div className="text-xs text-red-500 font-medium">{error}</div>}

                  <button
                    type="submit"
                    disabled={saving || !name.trim() || !channelUrl.trim()}
                    className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20 active:scale-95"
                  >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    {saving ? 'Создаю...' : 'Добавить и изучить канал'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* === STEP 2: ANALYZING === */}
            {step === 'analyzing' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-6 text-center"
              >
                <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="animate-spin text-violet-600" size={28} />
                </div>
                <h2 className="text-xl font-display font-black text-slate-900 mb-2">
                  Изучаю канал
                </h2>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                  ИИ читает посты, определяет тематику, стиль и голос автора...
                </p>
                <div className="mt-6 space-y-2">
                  {['Читаю последние публикации', 'Определяю темы и тон', 'Формирую профиль канала'].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-400 justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-300 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                      {step}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* === STEP 3: RESULT === */}
            {step === 'result' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {analysis ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                        <CheckCircle2 className="text-emerald-500" size={18} />
                      </div>
                      <div>
                        <h2 className="text-lg font-display font-black text-slate-900 leading-none">Канал изучен</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{name}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
                      {analysis.topic && (
                        <div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Тематика</div>
                          <p className="text-xs text-slate-700 font-medium">{analysis.topic}</p>
                        </div>
                      )}

                      {(analysis.contentPillars?.length ?? 0) > 0 && (
                        <div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-violet-400 mb-1.5">Темы контента</div>
                          <div className="flex flex-wrap gap-1">
                            {analysis.contentPillars!.map(p => (
                              <span key={p} className="text-[10px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-medium">{p}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {analysis.toneOfVoice && (
                        <div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Стиль и голос</div>
                          <p className="text-xs text-slate-600 leading-relaxed">{analysis.toneOfVoice}</p>
                        </div>
                      )}

                      {(analysis.forbiddenPhrases?.length ?? 0) > 0 && (
                        <div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-rose-400 mb-1.5">Чего избегать</div>
                          <div className="flex flex-wrap gap-1">
                            {analysis.forbiddenPhrases!.map(p => (
                              <span key={p} className="text-[10px] bg-rose-50 text-rose-500 px-2 py-0.5 rounded-full font-medium">{p}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 text-center">
                      Эти данные будут использоваться при каждой генерации поста
                    </p>
                  </>
                ) : (
                  <div className="py-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Target className="text-amber-500" size={22} />
                    </div>
                    <h2 className="text-lg font-display font-black text-slate-900 text-center mb-1">Канал добавлен</h2>
                    <p className="text-xs text-slate-400 text-center mb-2">Анализ будет запущен при первой генерации</p>
                    {analyzeError && (
                      <p className="text-xs text-rose-500 text-center">{analyzeError}</p>
                    )}
                  </div>
                )}

                <button
                  onClick={handleClose}
                  className="w-full py-3 bg-slate-900 hover:bg-violet-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all active:scale-95"
                >
                  Готово
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
