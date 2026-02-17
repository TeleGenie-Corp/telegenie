'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Send, Zap, ArrowRight, ExternalLink, Moon, Sun } from 'lucide-react';
import { useWidgetStore } from '../stores/widgetStore';
import { listContainer, listItem, ui, spring } from '../animationTokens';
import { components, typography, radii, shadows } from '../designTokens';

export const PublicWidget: React.FC = () => {
  const { 
    url, setUrl, point, setPoint, isAnalyzing, ideas, 
    selectedIdea, isGeneratingPost, generatedPost, 
    demoCount, maxDemos, generateDemo,
    isPublishing, publishedUrl
  } = useWidgetStore();

  React.useEffect(() => {
    // Force light mode isolation for the widget
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    document.body.style.backgroundColor = '#ffffff';
    document.body.style.color = '#0f172a';
    
    return () => {
      // Clean up inline styles on unmount
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
      // We don't restore 'dark' class because we don't know previous state easily, 
      // and redirect usually handles full reload or app logic will resync.
    };
  }, []);

  const handleJoin = () => {
    window.location.href = '/';
  };

  return (
    <div id="widget-root" className="w-full flex justify-center p-4 font-sans text-slate-900 selection:bg-violet-100 selection:text-violet-900">
      <div className="w-full max-w-lg">
        <div className="flex flex-col space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-slate-900 text-white transition-transform hover:scale-105">
                <Zap size={20} className="fill-current" />
              </div>
              <div>
                <h2 className={typography.heading}>
                  TeleGenie <span className="text-violet-600">Demo</span>
                </h2>
                <p className="text-xs font-medium text-slate-500">Бесплатный анализ канала за 10 секунд</p>
              </div>
            </div>
            {/* Theme toggle removed - strict light mode */}
          </div>

          <div className="space-y-6">
            {/* Input Section */}
            {!ideas.length && !isAnalyzing && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="space-y-3">
                  <div className="relative">
                    <input 
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Ссылка на Telegram канал (напр. t.me/durov)"
                      className={`${components.input} w-full py-4 px-5 text-base shadow-sm pr-12 bg-white border-slate-200 focus:bg-white`}
                      onKeyDown={(e) => e.key === 'Enter' && generateDemo()}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Send size={18} />
                    </div>
                  </div>

                  <div className="relative group">
                    <input 
                      type="text"
                      value={point}
                      onChange={(e) => setPoint(e.target.value)}
                      placeholder="Ваше послание читателям (необязательно)"
                      className={`${components.input} w-full py-3 px-5 text-sm shadow-sm pr-12 bg-white border-slate-200 focus:bg-white`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 cursor-help group-hover:text-violet-500 transition-colors">
                      <Zap size={14} />
                      <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-900 border border-white/10 text-white text-[10px] rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-2xl z-20">
                        Что продать или ваше послание аудитории
                      </div>
                    </div>
                  </div>
                </div>

                <motion.button 
                  {...ui.button}
                  onClick={generateDemo}
                  disabled={isAnalyzing || !url}
                  className={`${components.buttonMagic} w-full py-4 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-violet-500/20`}
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                  {isAnalyzing ? 'Анализирую...' : 'Сгенерировать идеи'}
                </motion.button>

                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Осталось попыток: {maxDemos - demoCount}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Loading State (Analyzing) */}
            {isAnalyzing && (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 animate-spin border-violet-100 border-t-violet-600" />
                  <Sparkles className="absolute inset-0 m-auto text-violet-500 animate-pulse" size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900">Магия в процессе...</h3>
                  <p className="text-xs max-w-[200px] text-slate-500">Читаю посты, изучаю ваш стиль и вытаскиваю смыслы</p>
                </div>
              </div>
            )}

            {/* Results State (Ideas or Post) */}
            {ideas.length > 0 && !isAnalyzing && (
              <div className="space-y-6">
                <AnimatePresence mode="wait">
                  {!selectedIdea ? (
                    <motion.div 
                      key="ideas-list"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className={`${typography.meta} text-slate-500`}>Идеи для постов</h3>
                        <button 
                          onClick={() => useWidgetStore.getState().reset()}
                          className="text-[10px] font-bold text-violet-500 hover:text-violet-600 uppercase tracking-widest underline decoration-violet-500/20 underline-offset-4"
                        >
                          Заново
                        </button>
                      </div>

                      <motion.div 
                        variants={listContainer}
                        initial="hidden"
                        animate="show"
                        className="space-y-3"
                      >
                        {ideas.map((idea) => (
                          <motion.div 
                            key={idea.id}
                            variants={listItem}
                            onClick={() => useWidgetStore.getState().selectIdea(idea)}
                            className="p-4 border rounded-2xl shadow-sm transition-all group cursor-pointer active:scale-98 hover:-translate-y-0.5 relative overflow-hidden bg-white border-slate-100 hover:border-violet-200"
                          >
                            <div className="flex gap-3">
                              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-violet-400 group-hover:bg-violet-600 transition-colors" />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md transition-colors bg-slate-100 text-slate-500 group-hover:bg-violet-50 group-hover:text-violet-600">
                                    {idea.goal}
                                  </span>
                                </div>
                                <p className="text-sm font-medium leading-relaxed transition-colors text-slate-700 group-hover:text-slate-900">
                                  {idea.title}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="post-preview"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <button 
                          onClick={() => useWidgetStore.setState({ selectedIdea: null, generatedPost: '' })}
                          className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors text-slate-400 hover:text-slate-600"
                        >
                          <ArrowRight className="rotate-180" size={12} /> К идеям
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-violet-600 text-white rounded-full shadow-sm">
                            {selectedIdea.goal}
                          </span>
                          <h3 className={`${typography.meta} text-slate-500`}>Готовый пост</h3>
                        </div>
                      </div>

                      {/* Telegram Post Preview */}
                      <div className="bg-[#879bb1] bg-[url('https://web.telegram.org/img/bg_0.png')] p-4 rounded-2xl min-h-[150px] relative overflow-hidden">
                        <div className="bg-white rounded-xl p-3 shadow-lg shadow-black/5 animate-in fade-in slide-in-from-bottom-2 duration-500 relative">
                          {isGeneratingPost && !generatedPost && (
                             <div className="flex items-center gap-2 py-2">
                               <Loader2 size={14} className="animate-spin text-violet-600" />
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Печатаю...</span>
                             </div>
                          )}
                          <div className="text-sm leading-relaxed text-slate-900 whitespace-pre-wrap">
                            {generatedPost}
                            {isGeneratingPost && generatedPost && <span className="inline-block w-1.5 h-4 bg-violet-600 ml-1 animate-pulse align-middle" />}
                          </div>
                          <div className="flex justify-end mt-2">
                            <span className="text-[10px] text-slate-400">
                              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions: Publish or View */}
                      <div className="flex gap-3">
                        {!publishedUrl ? (
                           <motion.button
                             initial={{ opacity: 0, y: 10 }}
                             animate={{ opacity: 1, y: 0 }}
                             onClick={() => useWidgetStore.getState().publishPost()}
                             disabled={isGeneratingPost || !generatedPost || isPublishing}
                             className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                               isGeneratingPost || !generatedPost 
                                 ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                 : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30 active:scale-95'
                             }`}
                           >
                             {isPublishing ? (
                               <>
                                 <Loader2 size={16} className="animate-spin" />
                                 Публикую...
                               </>
                             ) : (
                               <>
                                 <Send size={16} />
                                 Опубликовать в @AiKanalishe
                               </>
                             )}
                           </motion.button>
                        ) : (
                          <motion.a
                            href={publishedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
                          >
                            <ExternalLink size={16} />
                            Посмотреть пост
                          </motion.a>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Unlock Full Power CTA */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, ...spring.soft }}
                  className="pt-4"
                >
                  <div className="p-6 rounded-3xl relative overflow-hidden group border transition-all bg-slate-900 border-slate-800 text-white">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/20 blur-[40px] rounded-full translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-700" />
                    
                    <div className="relative z-10 space-y-4">
                      <div className="space-y-1">
                        <h4 className="text-base font-black tracking-tight flex items-center gap-2">
                          Понравилось? <Sparkles size={16} className="text-violet-400" />
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          ИИ может написать готовые посты, подобрать картинки и сам опубликовать их в ваш канал.
                        </p>
                      </div>

                      <motion.button 
                        {...ui.button}
                        onClick={handleJoin}
                        className="w-full py-3.5 bg-white text-slate-900 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                      >
                        Забрать полный доступ
                        <ArrowRight size={14} />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center">
              <a 
                href="https://t.me/AiKanalishe" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] font-bold transition-colors flex items-center gap-1.5 tracking-wider uppercase text-slate-400 hover:text-slate-600"
              >
                Сделано в TeleGenie <ExternalLink size={10} />
              </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicWidget;
