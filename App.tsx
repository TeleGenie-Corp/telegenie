
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, 
  Sparkles, 
  Layers, 
  Image as ImageIcon, 
  ExternalLink,
  ChevronRight,
  RefreshCw, 
  Zap, 
  Loader2, 
  CheckCircle2, 
  Star, 
  Link as LinkIcon, 
  MessageSquare, 
  AlertCircle,
  Target,
  Layout,
  User as UserIcon,
  LogOut,
  History,
  Clock,
  ArrowRight
} from 'lucide-react';
import { ChannelStrategy, Idea, Post, PostGoal, PostFormat, User, UserProfile } from './types';
import { GeminiService } from './services/geminiService';
import { TelegramService } from './services/telegramService';
import { StorageService } from './services/storageService';

const TELEGRAM_BOT_TOKEN = '7239435657:AAHi3BBSiOaWVf8eYdavHNORUA-eQ21jUvM';
const TELEGRAM_CHAT_ID = '-1003357173429';
const CHANNEL_URL = 'https://t.me/AiKanalishe';

const App: React.FC = () => {
  // --- AUTH STATE ---
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('telegenie_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [showLogin, setShowLogin] = useState(!user);

  // --- APP STATE ---
  const [strategy, setStrategy] = useState<ChannelStrategy>(() => {
    const saved = localStorage.getItem('telegenie_strategy_v11');
    return saved ? JSON.parse(saved) : {
      id: Math.random().toString(36).substr(2, 9),
      channelUrl: '',
      goal: PostGoal.INFORMATIONAL,
      format: PostFormat.LIST,
      userComments: ''
    };
  });
  
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedUrl, setLastAnalyzedUrl] = useState('');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [currentPost, setCurrentPost] = useState<Post | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<{ url: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // --- REFS ---
  const activeGenIdRef = useRef<string | null>(null);
  const roadmapRef = useRef<HTMLDivElement>(null);
  const builderRef = useRef<HTMLDivElement>(null);

  const profileData = useMemo(() => user ? StorageService.getProfile(user.id) : null, [user, currentPost]);

  // --- EFFECTS ---
  useEffect(() => {
    if (user) {
      localStorage.setItem('telegenie_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('telegenie_session');
    }
  }, [user]);

  useEffect(() => {
    if (strategy.channelUrl.trim()) {
      localStorage.setItem('telegenie_strategy_v11', JSON.stringify(strategy));
    }
    const url = strategy.channelUrl.trim();
    if (!url || url === lastAnalyzedUrl) return;
    const timer = setTimeout(() => handleAnalyzeChannel(url), 2500);
    return () => clearTimeout(timer);
  }, [strategy.channelUrl]);

  // --- HANDLERS ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const mockUser = { id: 'usr_123', email: 'creator@genie.ai', name: 'Elite Blogger' };
    setUser(mockUser);
    setShowLogin(false);
  };

  const handleLogout = () => {
    setUser(null);
    setShowLogin(true);
  };

  const handleAnalyzeChannel = async (url: string) => {
    if (analyzing) return;
    setAnalyzing(true);
    setError(null);
    try {
      const info = await GeminiService.analyzeChannel(url);
      setStrategy(prev => ({ ...prev, analyzedChannel: info }));
      setLastAnalyzedUrl(url);
    } catch (e: any) {
      setError("Не удалось проанализировать канал. Попробуйте вручную.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateIdeas = async () => {
    if (!strategy.channelUrl) return alert("Укажите канал");
    setIdeas([]);
    setLoadingIdeas(true);
    setError(null);
    try {
      let currentStrategy = strategy;
      if (!strategy.analyzedChannel || strategy.channelUrl !== lastAnalyzedUrl) {
        const info = await GeminiService.analyzeChannel(strategy.channelUrl);
        currentStrategy = { ...strategy, analyzedChannel: info };
        setStrategy(currentStrategy);
        setLastAnalyzedUrl(strategy.channelUrl);
      }
      const generatedIdeas = await GeminiService.generateIdeas(currentStrategy);
      setIdeas(generatedIdeas);
      setTimeout(() => roadmapRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      setError("Ошибка генерации. Повторите попытку.");
    } finally {
      setLoadingIdeas(false);
    }
  };

  const handleSelectIdea = async (idea: Idea) => {
    const genId = Math.random().toString(36).substring(7);
    activeGenIdRef.current = genId;
    setPublishSuccess(null);
    setError(null);
    setCurrentPost({ id: genId, text: '', generating: true, timestamp: Date.now() });
    setTimeout(() => builderRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    try {
      const contentPromise = GeminiService.generatePostContent(idea, strategy);
      const imagePromise = GeminiService.generateImage(idea.title);
      const [content, imageUrl] = await Promise.all([contentPromise, imagePromise]);
      if (activeGenIdRef.current !== genId) return;
      
      const newPost = { id: genId, text: content, imageUrl, generating: false, timestamp: Date.now() };
      setCurrentPost(newPost);
      if (user) StorageService.addPostToHistory(user.id, newPost);
    } catch (error) {
      setError("Ошибка создания контента.");
      setCurrentPost(null);
    }
  };

  const handlePublish = async (isPaid: boolean = false) => {
    if (!currentPost) return;
    setPublishing(true);
    try {
      const result = await TelegramService.publish(currentPost.text, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, currentPost.imageUrl, isPaid);
      if (result.success) setPublishSuccess({ url: result.messageId ? `${CHANNEL_URL}/${result.messageId}` : CHANNEL_URL });
      else alert(result.message);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setPublishing(false);
    }
  };

  // --- UI COMPONENTS ---
  if (showLogin) {
    return (
      <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-12 text-center animate-in fade-in zoom-in duration-700">
          <div className="space-y-4">
            <h1 className="font-display text-5xl font-black tracking-tighter text-slate-900 uppercase">TeleGenie</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">Authorized Access Only</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-8 bg-white border border-slate-100 p-10 rounded-[2.5rem] shadow-sm">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
              <input type="email" required placeholder="name@company.com" className="w-full border-b-2 border-slate-100 py-3 outline-none focus:border-violet-600 transition-colors text-lg font-medium" />
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-violet-600 transition-all flex items-center justify-center gap-3">
              Enter Studio <ArrowRight size={18} />
            </button>
          </form>
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest px-10 leading-relaxed">By entering you agree to our silent terms and high-end privacy standards.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-20 sm:space-y-32 selection:bg-violet-600 selection:text-white relative">
      
      {/* TOP NAV */}
      <nav className="flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-40 py-4 -mx-4 px-4 sm:px-0">
        <div className="font-display text-xl font-black tracking-tighter text-slate-900 uppercase">TG</div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowHistory(!showHistory)} className="p-3 text-slate-400 hover:text-violet-600 transition-colors">
            <History size={20} />
          </button>
          <div className="h-10 w-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 overflow-hidden group relative cursor-pointer">
            <UserIcon size={20} />
            <button onClick={handleLogout} className="absolute inset-0 bg-violet-600 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* HISTORY OVERLAY */}
      {showHistory && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white border-l border-slate-100 z-50 shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black uppercase tracking-widest text-sm text-slate-900">Archive</h3>
            <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-900">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {profileData?.generationHistory.length ? profileData.generationHistory.map(post => (
              <div key={post.id} onClick={() => { setCurrentPost(post); setShowHistory(false); }} className="p-4 border border-slate-50 rounded-2xl hover:border-violet-100 transition-all cursor-pointer group">
                <div className="flex items-center gap-3 mb-2">
                  <Clock size={12} className="text-slate-300" />
                  <span className="text-[10px] font-black text-slate-300 uppercase">{new Date(post.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{post.text}</p>
              </div>
            )) : (
              <div className="text-center py-20 text-slate-300 text-[10px] font-black uppercase tracking-widest">No history yet</div>
            )}
          </div>
        </div>
      )}

      <header className="flex flex-col items-center space-y-8 group">
        <div className="text-center space-y-4">
          <h1 className="font-display text-6xl sm:text-8xl font-black tracking-[-0.07em] text-slate-900 group-hover:text-violet-600 transition-colors duration-500 cursor-default uppercase">
            TeleGenie
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-[0.4em] text-center px-4">
            Elite Content Architect
          </p>
        </div>
      </header>

      {error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-rose-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-rose-400">
            <AlertCircle size={20} />
            <span className="text-xs font-black uppercase tracking-widest">{error}</span>
          </div>
        </div>
      )}

      <section className="bg-white border border-slate-100 rounded-[2.5rem] p-6 sm:p-12 space-y-12 transition-all duration-300 hover:border-slate-200">
        <div className="flex items-center gap-4">
          <Layers size={32} className="text-slate-900" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight uppercase">Архитектор</h2>
        </div>

        <div className="space-y-10">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <LinkIcon size={12} /> Канал
            </label>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={strategy.channelUrl}
                onChange={(e) => setStrategy({ ...strategy, channelUrl: e.target.value })}
                placeholder="t.me/your_channel"
                className="flex-1 bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl focus:border-violet-500 outline-none transition-all font-medium text-slate-700"
              />
              {analyzing && <div className="flex items-center gap-2 text-[10px] font-black uppercase text-violet-500 animate-pulse bg-violet-50 px-4 rounded-2xl"><Loader2 className="animate-spin" size={14} /></div>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Target size={12} /> Цель
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.values(PostGoal).map(g => (
                  <button key={g} onClick={() => setStrategy({ ...strategy, goal: g })} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${strategy.goal === g ? 'bg-violet-600 text-white border-violet-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-violet-200'}`}>{g}</button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Layout size={12} /> Формат
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.values(PostFormat).map(f => (
                  <button key={f} onClick={() => setStrategy({ ...strategy, format: f })} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${strategy.format === f ? 'bg-violet-600 text-white border-violet-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-violet-200'}`}>{f}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><MessageSquare size={12} /> Уточнения</label>
            <textarea rows={3} value={strategy.userComments} onChange={(e) => setStrategy({ ...strategy, userComments: e.target.value })} placeholder="Особые пожелания..." className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl focus:border-violet-500 outline-none transition-all resize-none font-medium text-slate-700 leading-relaxed shadow-inner" />
          </div>
        </div>

        <button onClick={handleGenerateIdeas} disabled={loadingIdeas || analyzing} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-lg uppercase tracking-[0.15em] flex items-center justify-center gap-3 hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-slate-100">
          {loadingIdeas ? <Loader2 className="animate-spin" /> : <Sparkles size={24} />}
          {loadingIdeas ? "Трансформирую..." : "Предложить идеи"}
        </button>
      </section>

      {ideas.length > 0 && (
        <section ref={roadmapRef} className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center gap-4">
            <Zap size={32} className="text-slate-900" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight uppercase">Варианты</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {ideas.map((idea) => (
              <div key={idea.id} onClick={() => handleSelectIdea(idea)} className={`group p-10 bg-white border rounded-[2.5rem] transition-all cursor-pointer relative overflow-hidden border-slate-100 hover:border-violet-200 shadow-sm`}>
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0"><ChevronRight size={32} className="text-violet-600" /></div>
                <h3 className="font-black text-2xl mb-4 pr-12 text-slate-900 group-hover:text-violet-600 transition-colors">{idea.title}</h3>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed line-clamp-3">{idea.description}</p>
                <div className="flex flex-wrap gap-3">
                  {idea.sources.map((s, i) => (
                    <span key={i} className="flex items-center gap-2 text-[9px] bg-slate-50 text-slate-400 px-3 py-1.5 rounded-lg border border-slate-100 uppercase font-black tracking-tight"><ExternalLink size={10} /> {s.length > 30 ? s.substring(0, 30) + '...' : s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {currentPost && (
        <section ref={builderRef} className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center gap-4">
            <RefreshCw size={32} className="text-slate-900" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight uppercase">Мастерская</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7 space-y-8">
              <div className="relative">
                <textarea 
                  value={currentPost.text}
                  onChange={(e) => setCurrentPost({ ...currentPost, text: e.target.value })}
                  disabled={currentPost.generating}
                  className="w-full bg-slate-50 border border-slate-100 p-10 rounded-[2.5rem] min-h-[400px] focus:border-violet-500 outline-none text-xl font-medium leading-[1.8] text-slate-700 resize-none shadow-inner"
                  placeholder="Магия..."
                />
                {currentPost.generating && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center rounded-[2.5rem] gap-6">
                    <Loader2 className="animate-spin text-violet-600" size={48} />
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest text-center animate-pulse px-8">ИИ в процессе творчества...</span>
                  </div>
                )}
              </div>
            </div>
            <div className="lg:col-span-5 space-y-8">
              <div className="aspect-square bg-slate-50 border border-slate-100 rounded-[2.5rem] overflow-hidden relative group/visual shadow-sm">
                {currentPost.imageUrl ? <img src={currentPost.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-300"><ImageIcon size={64} strokeWidth={1} /></div>}
                {currentPost.generating && <div className="absolute inset-0 bg-violet-600/10 backdrop-blur-sm flex items-center justify-center"><RefreshCw className="animate-spin text-white" size={48} /></div>}
              </div>

              {publishSuccess ? (
                <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2.5rem] flex flex-col items-center gap-6 shadow-sm">
                  <CheckCircle2 size={40} className="text-emerald-500" />
                  <a href={publishSuccess.url} target="_blank" className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg">Open in Telegram <ExternalLink size={14} /></a>
                  <button onClick={() => setPublishSuccess(null)} className="text-[9px] font-black text-emerald-400 uppercase">Back to Workshop</button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <button onClick={() => handlePublish(false)} disabled={publishing || currentPost.generating} className="w-full bg-violet-600 text-white py-6 rounded-[1.5rem] font-black text-lg uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-slate-900 transition-all shadow-lg">
                    {publishing ? <Loader2 className="animate-spin" /> : <Send size={24} />} {publishing ? "Publishing..." : "Send to Channel"}
                  </button>
                  <button onClick={() => handlePublish(true)} disabled={publishing || currentPost.generating} className="w-full bg-amber-400 text-amber-950 py-6 rounded-[1.5rem] font-black text-lg uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-amber-500 transition-all shadow-lg border-b-4 border-amber-600">
                    <Star size={24} fill="currentColor" /> {publishing ? "Creating..." : "Premium (1 ★)"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="pt-20 pb-20 border-t border-slate-100 text-center">
        <div className="text-slate-300 text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-3">TeleGenie Studio <Sparkles size={14} /> 2026</div>
      </footer>
    </div>
  );
};

export default App;
