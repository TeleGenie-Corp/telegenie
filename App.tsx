
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
  History,
  Clock,
  MessageCircle,
  Upload,
  Trash2,
  Check
} from 'lucide-react';
import { ChannelStrategy, Idea, Post, PostGoal, PostFormat, User, TelegramUser, UserProfile, PipelineState, GenerationConfig, LinkedChannel } from './types';
import { PostGenerationService } from './services/postGenerationService';
import { GeminiService } from './services/geminiService';
import { TelegramService } from './services/telegramService';
import { StorageService } from './services/storageService';
import { Auth } from './src/components/Auth';
import { Dashboard } from './src/components/Dashboard';
import { TelegramSettings } from './src/components/TelegramSettings';

const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID || '';
const CHANNEL_URL = import.meta.env.VITE_CHANNEL_URL || 'https://t.me/AiKanalishe';
const BOT_NAME = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'AI_TG_copywraiterbot';

interface StepSectionProps {
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
  isActive?: boolean;
}

const StepSection: React.FC<StepSectionProps> = ({ step, title, description, children, isActive = true }) => {
  return (
    <div className={`relative pl-8 sm:pl-16 transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
      {/* Connector Line */}
      <div className="absolute left-3 sm:left-[2.25rem] top-16 bottom-0 w-px bg-slate-100 -z-10"></div>
      
      {/* Step Number Bubble */}
      <div className="absolute left-0 sm:left-6 top-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] sm:text-xs font-black z-10 shadow-xl shadow-slate-200">
        {step}
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight uppercase flex items-center gap-3">
            {title}
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{description}</p>
        </div>
        
        <div>
          {children}
        </div>
      </div>
    </div>
  );
};

const AnalysisTerminal: React.FC<{ analyzing: boolean }> = ({ analyzing }) => {
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    if (!analyzing) {
      setLogs([]);
      return;
    }
    
    const steps = [
      "Connecting to Telegram Gateway...",
      "Resolving channel DNS...",
      "Extracting public metadata...",
      "Analyzing Tone of Voice patterns...",
      "Identifying top performing topics...",
      "Calibrating generation model...",
      "Finalizing content strategy..."
    ];
    
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < steps.length) {
        setLogs(prev => [...prev, steps[currentIndex]]);
        currentIndex++;
      }
    }, 800);
    
    return () => clearInterval(interval);
  }, [analyzing]);

  if (!analyzing && logs.length === 0) return null;

  return (
    <div className="bg-slate-900 rounded-xl p-4 font-mono text-[10px] sm:text-xs text-green-400 border border-slate-800 shadow-inner min-h-[120px] overflow-hidden flex flex-col">
      {logs.map((log, i) => (
        <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-300">
          <span className="opacity-50 mr-2">{new Date().toLocaleTimeString().split(' ')[0]}</span>
          <span className="text-violet-400 mr-2">{'>'}</span>
          {log}
        </div>
      ))}
      <div className="mt-1 animate-pulse">
        <span className="text-violet-400 mr-2">{'>'}</span>
        <span className="w-2 h-4 bg-green-400 inline-block align-middle"></span>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // --- AUTH STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showLogin, setShowLogin] = useState(true);

  // --- APP STATE ---
  const [strategy, setStrategy] = useState<ChannelStrategy>(() => {
    const saved = localStorage.getItem('telegenie_strategy_v11');
    const parsed = saved ? JSON.parse(saved) : null;
    return {
      id: parsed?.id || Math.random().toString(36).substr(2, 9),
      channelUrl: parsed?.channelUrl || '',
      goal: parsed?.goal || PostGoal.INFORMATIONAL,
      format: parsed?.format || PostFormat.LIST,
      userComments: parsed?.userComments || '',
      withImage: false // Disabled by default - image generation blocked
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
  const [pipelineState, setPipelineState] = useState<PipelineState>({ stage: 'idle', progress: 0 });

  // --- REFS ---
  const activeGenIdRef = useRef<string | null>(null);
  const roadmapRef = useRef<HTMLDivElement>(null);
  const builderRef = useRef<HTMLDivElement>(null);

  const profileData = null; // Removed in favor of state

  // --- EFFECTS ---
  // --- EFFECTS ---
  useEffect(() => {
    let unsubscribe: () => void;

    const initAuth = async () => {
      const { auth } = await import('./services/firebaseConfig');
      const { onAuthStateChanged } = await import('firebase/auth');
      
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const newUser: User = {
            id: firebaseUser.uid,
            first_name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email || undefined,
            username: firebaseUser.email?.split('@')[0],
            avatar: firebaseUser.photoURL || undefined
          };
          setUser(newUser);
          setShowLogin(false);

          // Sync profile and balance from Firestore
          try {
            const { UserService } = await import('./services/userService');
            const userProfile = await UserService.syncProfile(firebaseUser.uid);
            setProfile(userProfile);
          } catch (e) {
            console.error("Error syncing profile:", e);
          }
        } else {
          setUser(null);
          setProfile(null);
          setShowLogin(true);
        }
      });
    };

    initAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [])

;

  // Sync channel URL from linked channel
  useEffect(() => {
    if (profile?.linkedChannel && (!strategy.channelUrl || !strategy.analyzedChannel)) {
      const channelUrl = `https://t.me/${profile.linkedChannel.username.replace('@', '')}`;
      setStrategy(prev => ({ ...prev, channelUrl }));
    }
  }, [profile?.linkedChannel]);

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
  const handleLogout = async () => {
    const { auth } = await import('./services/firebaseConfig');
    await auth.signOut();
  };

  const handleTelegramLink = async (telegramUser: TelegramUser) => {
    if (!profile || !user) return;
    try {
      const { UserService } = await import('./services/userService');
      const updatedProfile = { ...profile, telegram: telegramUser };
      await UserService.updateProfile(updatedProfile);
      setProfile(updatedProfile);
    } catch (e) {
      console.error('Failed to link Telegram:', e);
      setError('Не удалось привязать Telegram аккаунт.');
    }
  };

  const handleAnalyzeChannel = async (url: string) => {
    if (analyzing) return;
    setAnalyzing(true);
    setError(null);
    try {
      const { info, usage: analysisUsage } = await GeminiService.analyzeChannel(url);
      setStrategy(prev => ({ ...prev, analyzedChannel: info, analysisUsage }));
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
        const { info, usage: analysisUsage } = await GeminiService.analyzeChannel(strategy.channelUrl);
        currentStrategy = { ...strategy, analyzedChannel: info, analysisUsage };
        setStrategy(currentStrategy);
        setLastAnalyzedUrl(strategy.channelUrl);
      }
      const { ideas: generatedIdeas, usage: ideasUsage } = await GeminiService.generateIdeas(currentStrategy);
      const ideasWithUsage = generatedIdeas.map(idea => ({ ...idea, usage: ideasUsage }));
      setIdeas(ideasWithUsage);
      setTimeout(() => roadmapRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e: any) {
      if (e?.message?.includes('503') || e?.message?.includes('overloaded')) {
        setError("Нейросеть перегружена. Пожалуйста, попробуйте еще раз через минуту.");
      } else if (e?.message?.includes('Blocked') || e?.message?.includes('failed to fetch')) {
        setError("Доступ заблокирован (возможно, AdBlock). Пожалуйста, отключите блокировщик рекламы.");
      } else {
        setError("Не удалось сгенерировать идеи. Попробуйте обновить страницу.");
      }
    } finally {
      setLoadingIdeas(false);
    }
  };

  const handleSelectIdea = async (idea: Idea) => {
    if (!profile || profile.balance <= 0) {
      setError("Недостаточно кредитов. Пополните баланс.");
      return;
    }
    if (!user) {
      setError("Необходимо авторизоваться.");
      return;
    }

    setPublishSuccess(null);
    setError(null);
    setCurrentPost({ id: 'generating', text: '', generating: true, timestamp: Date.now() });
    setPipelineState({ stage: 'validating', progress: 0, currentTask: 'Запуск...' });
    setTimeout(() => builderRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    const config: GenerationConfig = {
      withImage: strategy.withImage || false,
      withAnalysis: false
    };

    const result = await PostGenerationService.generate(
      { idea, strategy, config, userId: user.id },
      (state) => setPipelineState(state)
    );

    if (!result.success || !result.post) {
      setError(result.errors.join(', ') || 'Ошибка генерации');
      setCurrentPost(null);
      setPipelineState({ stage: 'failed', progress: 0, error: result.errors[0] });
      return;
    }

    // Helper to replace undefined with null recursively (for Firestore)
    const deepSanitize = (obj: any): any => {
      if (obj === undefined) return null;
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(deepSanitize);
      return Object.keys(obj).reduce((acc: any, key) => {
        acc[key] = deepSanitize(obj[key]);
        return acc;
      }, {});
    };

    const newPost = deepSanitize(result.post);
    setCurrentPost(newPost);

    // Persist to Firestore
    try {
      const { UserService } = await import('./services/userService');
      const postForHistory = newPost.imageUrl?.startsWith('data:') 
        ? { ...newPost, imageUrl: null }
        : newPost;
      const updatedProfile = {
        ...profile,
        balance: profile.balance - result.costs.total,
        generationHistory: [postForHistory, ...profile.generationHistory].slice(0, 50)
      };
      await UserService.updateProfile(updatedProfile);
      setProfile(updatedProfile);
    } catch (saveError) {
      console.error('Failed to save to history:', saveError);
    }
  };

  const handlePublish = async () => {
    if (!currentPost) return;
    
    // Use linked channel if available, otherwise fall back to env vars
    const chatId = profile?.linkedChannel?.chatId || TELEGRAM_CHAT_ID;
    const channelUrl = profile?.linkedChannel?.username 
      ? `https://t.me/${profile.linkedChannel.username.replace('@', '')}` 
      : CHANNEL_URL;

    if (!chatId) {
      setError('Подключите канал для публикации');
      return;
    }

    setPublishing(true);
    try {
      // Use custom bot token if available, otherwise default
      const token = profile?.linkedChannel?.botToken || TELEGRAM_BOT_TOKEN;
      const result = await TelegramService.publish(currentPost.text, token, chatId, currentPost.imageUrl);
      if (result.success) {
        setPublishSuccess({ url: result.messageId ? `${channelUrl}/${result.messageId}` : channelUrl });
        
        // Update history to mark as published
        if (profile) {
          const { UserService } = await import('./services/userService');
          const updatedHistory = profile.generationHistory.map(p => 
            p.id === currentPost.id ? { ...p, publishedAt: Date.now() } : p
          );
          const updatedProfile = { ...profile, generationHistory: updatedHistory };
          await UserService.updateProfile(updatedProfile);
          setProfile(updatedProfile);
          setCurrentPost({ ...currentPost, publishedAt: Date.now() });
        }
      } else {
        alert(result.message);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleChannelConnect = async (channel: LinkedChannel) => {
    if (!profile || !user) return;
    try {
      const { UserService } = await import('./services/userService');
      const updatedProfile = { ...profile, linkedChannel: channel };
      await UserService.updateProfile(updatedProfile);
      setProfile(updatedProfile);
      
      // Auto-set as default channel for Architect
      const channelUrl = `https://t.me/${channel.username.replace('@', '')}`;
      setStrategy(prev => ({ ...prev, channelUrl }));
    } catch (e) {
      console.error('Failed to link channel:', e);
      setError('Не удалось сохранить канал.');
    }
  };

  const handleChannelDisconnect = async () => {
    if (!profile || !user) return;
    try {
      const { UserService } = await import('./services/userService');
      const updatedProfile = { ...profile, linkedChannel: undefined };
      await UserService.updateProfile(updatedProfile);
      setProfile(updatedProfile);
    } catch (e) {
      console.error('Failed to unlink channel:', e);
    }
  };

  // --- UI COMPONENTS ---
  if (showLogin) {
    return (
      <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center">
        <div className="absolute inset-0 bg-white/90 backdrop-blur-xl"></div>
        <div className="max-w-md w-full space-y-12 text-center animate-in fade-in zoom-in duration-700 relative z-10">
          <div className="space-y-4">
            <h1 className="font-display text-5xl font-black tracking-tighter text-slate-900 uppercase drop-shadow-sm">TeleGenie</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em]">AI Content Architect</p>
          </div>
          
          <div className="bg-white/50 border border-white/50 p-12 rounded-[3.5rem] shadow-2xl backdrop-blur-md">
            <div className="space-y-8">
              <Auth onLogin={() => {}} />
            </div>
          </div>

          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-10 leading-relaxed">
            By entering you agree to our terms of service.<br/>Secure connection via Telegram.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-10 space-y-16 sm:space-y-24 selection:bg-violet-600 selection:text-white relative">
      
      {/* TOP NAV */}
      <nav className="flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-40 py-4 -mx-4 px-4 sm:px-0">
        <div className="font-display text-xl font-black tracking-tighter text-slate-900 uppercase">TG</div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowHistory(!showHistory)} className="p-3 text-slate-400 hover:text-violet-600 transition-colors">
            <History size={20} />
          </button>
        </div>
      </nav>

      {/* HEADER */}
      <header className="flex flex-col items-center space-y-8 group pb-16 pt-8">
        <div className="text-center space-y-6 max-w-3xl px-6">
          <div className="space-y-2">
            <h1 className="font-display text-6xl sm:text-8xl font-black tracking-[-0.07em] text-slate-900 group-hover:text-violet-600 transition-colors duration-500 cursor-default uppercase">
              TeleGenie
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-[0.4em]">
              Elite Content Architect
            </p>
          </div>
          
          <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            <p className="text-lg sm:text-xl font-medium text-slate-600 leading-relaxed">
              Ваш персональный ИИ-редактор. <span className="text-slate-900 font-bold">Анализирует ваш канал</span>, считывает стиль и генерирует уникальные посты с иллюстрациями.
            </p>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              От идеи до публикации — за минуты.
            </p>
          </div>
        </div>
      </header>

      {/* STEP 1: IDENTITY */}
      {user && (
        <StepSection 
          step="01" 
          title="Идентификация" 
          description="Профиль оператора системы"
        >
          <Dashboard user={user} profile={profile} onLogout={handleLogout} />
        </StepSection>
      )}

      {/* STEP 2: NEURAL LINK */}
      {user && (
        <StepSection 
          step="02" 
          title="Настройка Канала" 
          description="Подключение к Telegram"
        >
          <TelegramSettings
            botToken={TELEGRAM_BOT_TOKEN}
            linkedChannel={profile?.linkedChannel}
            onChannelConnect={handleChannelConnect}
            onChannelDisconnect={handleChannelDisconnect}
          />
        </StepSection>
      )}

      {/* HISTORY OVERLAY */}
      {showHistory && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white border-l border-slate-100 z-50 shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
          <div className="p-8 border-b border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest text-sm text-slate-900">Archive</h3>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-900 text-2xl leading-none">×</button>
            </div>
            {profile && profile.generationHistory.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Investment</span>
                <span className="text-sm font-black text-violet-600">
                  ${profile.generationHistory.reduce((acc, p) => 
                    acc + 
                    (p.usage?.estimatedCostUsd || 0) + 
                    (p.imageUsage?.estimatedCostUsd || 0) + 
                    (p.analysisUsage?.estimatedCostUsd || 0) + 
                    (p.ideasUsage?.estimatedCostUsd || 0)
                  , 0).toFixed(3)}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {profile?.generationHistory.length ? profile.generationHistory.map(post => (
              <div key={post.id} onClick={() => { setCurrentPost(post); setShowHistory(false); }} className="p-4 border border-slate-50 rounded-2xl hover:border-violet-100 transition-all cursor-pointer group space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock size={10} className="text-slate-300" />
                    <span className="text-[9px] font-black text-slate-300 uppercase">{new Date(post.timestamp).toLocaleDateString()}</span>
                  </div>
                  {post.usage && (
                    <span className="text-[9px] font-black text-violet-400 uppercase tracking-tighter">
                      ${(
                        (post.usage?.estimatedCostUsd || 0) + 
                        (post.imageUsage?.estimatedCostUsd || 0) + 
                        (post.analysisUsage?.estimatedCostUsd || 0) + 
                        (post.ideasUsage?.estimatedCostUsd || 0)
                      ).toFixed(4)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">{post.text}</p>
                <div className="flex items-center gap-2 pt-1">
                  {post.publishedAt ? (
                    <div className="flex items-center gap-1 text-[8px] font-black uppercase text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md">
                      <CheckCircle2 size={8} /> Published
                    </div>
                  ) : (
                    <div className="text-[8px] font-black uppercase text-slate-300">Draft</div>
                  )}
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black uppercase text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">
                    Apply to Studio
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-20 text-slate-300 text-[10px] font-black uppercase tracking-widest">No history yet</div>
            )}
          </div>
        </div>
      )}



      {error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-rose-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-rose-400">
            <AlertCircle size={20} />
            <span className="text-xs font-black uppercase tracking-widest">{error}</span>
          </div>
        </div>
      )}

      {/* STEP 3: STRATEGY */}
      {user && (
        <StepSection 
          step="03" 
          title="Архитектор" 
          description="Контекст и параметры генерации"
          isActive={!!profile?.linkedChannel}
        >
          <section className="bg-white rounded-[2.5rem] p-6 sm:p-12 space-y-12 transition-all duration-300">
            {/* Removed internal header since it's now in StepSection */}

        <div className="space-y-10">
          {/* Channel Info - Read Only */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <LinkIcon size={12} /> Канал для публикации
            </label>
            
            {profile?.linkedChannel ? (
              /* Unified Channel & Analytics Card */
              <div className="pl-1">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-violet-600 shadow-sm">
                    <MessageCircle size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{profile.linkedChannel.title}</h3>
                    <p className="text-xs text-slate-500 font-bold">{profile.linkedChannel.username}</p>
                  </div>
                </div>

                {/* Integrated Analytics */}
                {strategy.analyzedChannel && !analyzing && (
                  <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-3 animate-in fade-in slide-in-from-top-1 duration-500">
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-violet-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-violet-600">
                        {strategy.analyzedChannel.topic}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed italic">
                      "{strategy.analyzedChannel.description}"
                    </p>
                  </div>
                )}

                {/* Terminal Insight */}
                {analyzing && <AnalysisTerminal analyzing={analyzing} />}
              </div>
            ) : (
              /* No Channel Connected */
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <AlertCircle size={20} className="text-amber-600" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">Канал не подключен</p>
                    <p className="text-xs text-amber-600 font-medium">Подключите канал в настройках для публикации</p>
                  </div>
                </div>
              </div>
            )}
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

        {/* Magnetic Action Button */}
        <div className="pt-6">
          <button 
            onClick={handleGenerateIdeas} 
            disabled={loadingIdeas || analyzing || !strategy.channelUrl} 
            className="w-full relative group overflow-hidden bg-slate-900 text-white p-1 rounded-3xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-200 hover:shadow-violet-200 hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative bg-slate-900 group-hover:bg-slate-900/90 py-6 rounded-[20px] flex items-center justify-center gap-3 transition-colors">
              {loadingIdeas ? <Loader2 className="animate-spin text-white" /> : <Sparkles size={24} className="text-violet-400 group-hover:text-white transition-colors" />}
              <span className="font-black text-lg uppercase tracking-[0.15em] group-hover:text-white transition-colors">
                {loadingIdeas ? "Трансформирую..." : "Предложить идеи"}
              </span>
            </div>
          </button>
        </div>
          </section>
        </StepSection>
      )}

      {/* STEP 4: WORKSHOP (Phantom Future) */}
      <StepSection 
        step="04" 
        title="Генерация" 
        description="Выбор идеи и финальная сборка"
        isActive={ideas.length > 0 || !!currentPost}
      >
        <div className={`space-y-16 transition-all duration-700 ${!(ideas.length > 0 || !!currentPost) ? 'blur-sm grayscale opacity-60 pointer-events-none select-none' : ''}`}>
          
          {/* Phantom overlay if locked */}
          {!(ideas.length > 0 || !!currentPost) && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="bg-white/80 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/50 shadow-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Ожидание стратегии</span>
              </div>
            </div>
          )}

      {ideas.length > 0 && (
        <section ref={roadmapRef} className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center gap-4">
            <Zap size={32} className="text-slate-900" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight uppercase">Варианты</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
        <section ref={builderRef} className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center gap-4 mb-8">
            <RefreshCw size={32} className="text-slate-900" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight uppercase">Мастерская</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Telegram-style Post Preview */}
            <div className="lg:col-span-7 xl:col-span-6">
                {/* Telegram-style Chat Container */}
                <div className="bg-[#879bb1] bg-[url('https://web.telegram.org/img/bg_0.png')] border border-slate-200 rounded-2xl shadow-lg overflow-hidden max-w-[420px] mx-auto min-h-[400px] flex flex-col">
                  
                  {/* Fake Chat Header */}
                  <div className="bg-white/90 backdrop-blur-sm p-3 border-b border-white/20 flex items-center gap-4 shadow-sm z-10 sticky top-0">
                     <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {strategy.analyzedChannel?.name?.charAt(0) || 'T'}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-slate-900 truncate">
                          {strategy.analyzedChannel?.name || 'Telegram Channel'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          13 420 подписчиков
                        </div>
                     </div>
                  </div>

                  {/* Message Area */}
                  <div className="flex-1 p-3 flex flex-col justify-end pb-6">
                    {/* The Message Bubble */}
                    <div className="bg-white rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-sm p-1 shadow-sm max-w-[95%] self-start relative">
                        
                        {/* Image */}
                        {currentPost.imageUrl && (
                          <div className="rounded-xl overflow-hidden mb-1 relative">
                             <img src={currentPost.imageUrl} className="w-full h-auto max-h-[400px] object-cover block" alt="Post visual" />
                          </div>
                        )}
                        
                        {/* Text Content */}
                        <div className={`px-3 py-2 ${currentPost.imageUrl ? '' : 'pt-3'}`}>
                             {currentPost.generating ? (
                                <div className="space-y-2 w-[240px]">
                                  <div className="h-3 bg-slate-100 rounded w-full animate-pulse"></div>
                                  <div className="h-3 bg-slate-100 rounded w-4/5 animate-pulse"></div>
                                  <div className="h-3 bg-slate-100 rounded w-2/5 animate-pulse"></div>
                                </div>
                              ) : (
                                <p className="text-[15px] text-slate-900 leading-[1.3] whitespace-pre-wrap font-sans">
                                  {currentPost.text || 'Текст поста...'}
                                </p>
                              )}
                        </div>

                        {/* Meta Info (Time & Views) in Bubble */}
                        <div className="flex justify-end items-center gap-1.5 px-3 pb-1.5 select-none opacity-60">
                            <span className="text-[10px] text-slate-500">1.2K</span>
                            <span className="text-[10px] text-slate-500">{new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                            <Check size={12} className="text-sky-500 ml-0.5" />
                        </div>
                    </div>
                  </div>
                </div>
            </div>

            {/* Edit & Actions Panel */}
            <div className="lg:col-span-5 xl:col-span-6 space-y-6">
              
              {/* Visuals - NEW */}
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <ImageIcon size={12} /> Визуал
                 </label>
                 
                 <div 
                   onPaste={(e) => {
                     const items = e.clipboardData.items;
                     for (let i = 0; i < items.length; i++) {
                       if (items[i].type.indexOf("image") !== -1) {
                         const blob = items[i].getAsFile();
                         if (blob) {
                           const url = URL.createObjectURL(blob);
                           setCurrentPost(prev => prev ? ({ ...prev, imageUrl: url }) : null);
                         }
                       }
                     }
                   }}
                   className="bg-slate-50 border border-slate-100 rounded-2xl p-4 transition-all hover:border-violet-200 group"
                 >
                   {!currentPost.imageUrl ? (
                     <div className="flex flex-col items-center justify-center gap-4 py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl group-hover:border-violet-300/50 transition-colors bg-white/50">
                       <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 group-hover:text-violet-500 transition-colors">
                         <Upload size={20} />
                       </div>
                       <div className="text-center space-y-1">
                         <p className="text-xs font-bold text-slate-600">Загрузить изображение</p>
                         <p className="text-[10px] font-medium opacity-60">или вставьте из буфера (Ctrl+V)</p>
                       </div>
                       <input 
                         type="file" 
                         accept="image/*" 
                         className="absolute inset-0 opacity-0 cursor-pointer"
                         onChange={(e) => {
                           if (e.target.files && e.target.files[0]) {
                             const url = URL.createObjectURL(e.target.files[0]);
                             setCurrentPost(prev => prev ? ({ ...prev, imageUrl: url }) : null);
                           }
                         }}
                       />
                     </div>
                   ) : (
                     <div className="relative rounded-xl overflow-hidden group/image">
                       <img src={currentPost.imageUrl} alt="Uploaded" className="w-full h-48 object-cover" />
                       <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                         <button 
                           onClick={() => setCurrentPost(prev => prev ? ({ ...prev, imageUrl: undefined }) : null)}
                           className="bg-white/10 hover:bg-rose-500 text-white p-2 rounded-lg backdrop-blur-md transition-colors"
                         >
                           <Trash2 size={16} />
                         </button>
                       </div>
                     </div>
                   )}

                   {/* AI Generation (Future) */}
                   <div className="mt-3 flex items-center justify-between px-1">
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">AI Генерация</span>
                     <span className="text-[9px] font-black bg-slate-100 text-slate-400 px-2 py-0.5 rounded uppercase">Скоро</span>
                   </div>
                 </div>
              </div>
              {/* Text Editor */}
              <div className="relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Редактировать текст</label>
                <textarea 
                  value={currentPost.text}
                  onChange={(e) => setCurrentPost({ ...currentPost, text: e.target.value })}
                  disabled={currentPost.generating}
                  className="w-full bg-slate-50 border border-slate-100 p-6 rounded-2xl min-h-[200px] focus:border-violet-500 outline-none text-sm font-medium leading-relaxed text-slate-700 resize-none"
                  placeholder="Текст поста..."
                />
                <div className="absolute bottom-4 right-4 text-[10px] text-slate-300 font-bold">
                  {currentPost.text?.length || 0} / 1000
                </div>
              </div>

              {/* Cost Panel */}
              {currentPost.usage && !currentPost.generating && (
                <div className="flex flex-wrap gap-4 items-center p-6 bg-slate-900 rounded-2xl text-white">
                  <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Стоимость</div>
                    <div className="text-xl font-black">
                      ${(
                        (currentPost.analysisUsage?.estimatedCostUsd || 0) + 
                        (currentPost.ideasUsage?.estimatedCostUsd || 0) + 
                        (currentPost.usage?.estimatedCostUsd || 0) + 
                        (currentPost.imageUsage?.estimatedCostUsd || 0)
                      ).toFixed(4)}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-wrap gap-3 justify-end text-[9px]">
                    {currentPost.usage && <span className="bg-slate-800 px-2 py-1 rounded">Текст: ${currentPost.usage.estimatedCostUsd.toFixed(4)}</span>}
                    {currentPost.imageUsage && <span className="bg-slate-800 px-2 py-1 rounded">Изображение: ${currentPost.imageUsage.estimatedCostUsd.toFixed(4)}</span>}
                  </div>
                </div>
              )}

              {/* Publish Button */}
              {publishSuccess ? (
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex flex-col items-center gap-4">
                  <CheckCircle2 size={32} className="text-emerald-500" />
                  <a href={publishSuccess.url} target="_blank" className="w-full py-4 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                    Открыть в Telegram <ExternalLink size={14} />
                  </a>
                  <button onClick={() => setPublishSuccess(null)} className="text-[10px] font-bold text-emerald-500 uppercase">Назад</button>
                </div>
              ) : (
                <button 
                  onClick={() => handlePublish()} 
                  disabled={publishing || currentPost.generating} 
                  className="w-full bg-violet-600 text-white py-5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-900 transition-all disabled:opacity-50"
                >
                  {publishing ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  {publishing ? "Публикация..." : "Опубликовать"}
                </button>
              )}
            </div>
          </div>
        </section>
      )}

          </div>
        </StepSection>

      <footer className="pt-20 pb-20 border-t border-slate-100 text-center">
        <div className="text-slate-300 text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-3">TeleGenie Studio <Sparkles size={14} /> 2026</div>
      </footer>
    </div>
  );
};

export default App;
