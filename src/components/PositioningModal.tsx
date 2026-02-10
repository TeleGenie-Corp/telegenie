import React, { useState } from 'react';
import { X, Sparkles, Wand2, Check, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { GeminiService } from '../../services/geminiService';
import { ChannelInfo } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface PositioningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (positioning: string) => void;
  channelInfo?: ChannelInfo;
  currentPositioning?: string;
  channelUrl?: string;
}

const QUESTIONS = [
  { id: 'audience', label: '1. Кто моя целевая аудитория?', placeholder: 'Кто именно, какие ситуации/кейсы использования...' },
  { id: 'problem', label: '2. Какую ключевую проблему я закрываю?', placeholder: 'Боль или задача аудитории...' },
  { id: 'category', label: '3. В какой категории я конкурирую?', placeholder: 'Как меня должны "положить на полку" в голове...' },
  { id: 'diff', label: '4. Чем я отличаюсь от альтернатив?', placeholder: '2-3 чётких отличия...' },
  { id: 'benefit', label: '5. Главная выгода клиента?', placeholder: 'Не фича, а результат для него...' },
  { id: 'emotion', label: '6. Эмоции и ассоциации?', placeholder: '2-3 прилагательных...' },
  { id: 'phrase', label: '7. Как сказать одной фразой?', placeholder: 'Понятной человеку с улицы...' },
];

export const PositioningModal: React.FC<PositioningModalProps> = ({ 
  isOpen, onClose, onSave, channelInfo, currentPositioning, channelUrl 
}) => {
  const [step, setStep] = useState<'questions' | 'formula'>('questions');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generatedFormula, setGeneratedFormula] = useState(currentPositioning || '');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // if (!isOpen) return null; // Removed for AnimatePresence

  const handleAutoFill = async () => {
    if (!channelUrl) return;
    setAnalyzing(true);
    try {
      const result = await GeminiService.analyzePositioning(channelUrl);
      if (result) {
          setAnswers(result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateFormula = async () => {
    setLoading(true);
    try {
      const formula = await GeminiService.generatePositioningFormula(answers);
      setGeneratedFormula(formula);
      setStep('formula');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg md:max-w-2xl p-6 md:p-8 relative max-h-[90vh] overflow-hidden flex flex-col"
          >
            
            <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <X size={20} />
            </button>

            <h2 className="text-2xl font-display font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Sparkles className="text-violet-600 dark:text-violet-500" />
                Позиционирование
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                Определи, кто ты для аудитории. Это фундамент всех твоих постов.
            </p>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {step === 'questions' ? (
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        {/* Actions */}
                        <div className="bg-violet-50 dark:bg-violet-900/20 p-4 rounded-xl flex items-center justify-between border border-violet-100 dark:border-violet-900/30">
                            <div className="text-xs text-violet-800 dark:text-violet-300 font-medium">
                                {analyzing ? 'Анализирую канал...' : 'Нет идей? Пусть ИИ заполнит черновик.'}
                            </div>
                            <button 
                                onClick={handleAutoFill}
                                disabled={analyzing || !channelUrl}
                                className="bg-white dark:bg-violet-800 text-violet-700 dark:text-violet-100 hover:bg-violet-100 dark:hover:bg-violet-700 px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {analyzing ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
                                {analyzing ? 'Думаю...' : 'Заполнить по каналу'}
                            </button>
                        </div>

                        <div className="space-y-4">
                            {QUESTIONS.map((q) => (
                                <div key={q.id}>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                                        {q.label}
                                    </label>
                                    <textarea
                                        value={answers[q.id] || ''}
                                        onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                                        placeholder={q.placeholder}
                                        rows={2}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:border-violet-300 focus:bg-white dark:focus:bg-slate-800 dark:text-white focus:ring-4 focus:ring-violet-500/10 transition-all outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                    />
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 p-6 rounded-2xl">
                            <h3 className="text-emerald-900 dark:text-emerald-300 font-bold mb-4 flex items-center gap-2">
                                <Check size={18} /> Твоя формула позиционирования
                            </h3>
                            <textarea
                                value={generatedFormula}
                                onChange={(e) => setGeneratedFormula(e.target.value)}
                                rows={6}
                                className="w-full bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 text-base font-medium text-slate-800 dark:text-slate-200 leading-relaxed shadow-sm focus:ring-4 focus:ring-emerald-500/10 outline-none"
                            />
                             <p className="mt-3 text-xs text-emerald-700/70 dark:text-emerald-400/70 italic">
                                Теперь эта формула будет использоваться нейросетью при написании каждого поста.
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>

            <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                {step === 'questions' ? (
                    <button 
                        onClick={handleGenerateFormula}
                        disabled={loading}
                        className="bg-slate-900 hover:bg-violet-600 dark:bg-white dark:text-slate-900 dark:hover:bg-violet-200 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-slate-200 dark:shadow-none hover:shadow-violet-200"
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                        Собрать формулу
                    </button>
                ) : (
                    <>
                        <button 
                            onClick={() => setStep('questions')}
                            className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white px-4 py-3 font-bold text-sm transition-colors"
                        >
                            Назад к вопросам
                        </button>
                        <button 
                            onClick={() => { onSave(generatedFormula); onClose(); }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-200 dark:shadow-none"
                        >
                            Сохранить и Применить
                        </button>
                    </>
                )}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
