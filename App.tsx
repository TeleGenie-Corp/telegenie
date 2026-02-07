import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Settings, 
  MessageCircle, 
  ChevronRight, 
  RefreshCw, 
  Zap, 
  Loader2, 
  CheckCircle2, 
  Clock,
  Layout,
  Target,
  MessageSquare,
  Link as LinkIcon,
  AlertCircle,
  ExternalLink,
  HeartHandshake,
  Menu,
  X,
  Send,
  Wand2,
  UserCircle,
  MessageSquareQuote,
  LayoutGrid
} from 'lucide-react';
import { ChannelStrategy, Idea, Post, PostGoal, PostFormat, User, TelegramUser, UserProfile, PipelineState, GenerationConfig, LinkedChannel, Brand, PostProject } from './types';
import { PostGenerationService } from './services/postGenerationService';
import { GeminiService } from './services/geminiService';
import { TelegramService } from './services/telegramService';
import { BrandService } from './services/brandService';
import { PostProjectService } from './services/postProjectService';
import { Auth } from './src/components/Auth';
import { Dashboard } from './src/components/Dashboard';
import { TelegramSettings } from './src/components/TelegramSettings';
import { TipTapEditor } from './src/components/TipTapEditor';
import { PositioningModal } from './src/components/PositioningModal';
import { WorkspaceScreen } from './src/components/WorkspaceScreen';
import { SubscriptionModal } from './src/components/SubscriptionModal';
import { CreateBrandModal } from './src/components/CreateBrandModal';



const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID || '';
const CHANNEL_URL = import.meta.env.VITE_CHANNEL_URL || 'https://t.me/AiKanalishe';

// --- COMPONENTS ---

const AnalysisTerminal: React.FC<{ analyzing: boolean }> = ({ analyzing }) => {
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    if (!analyzing) { setLogs([]); return; }
    const steps = [
      "Connecting to Telegram Gateway...",
      "Resolving channel DNS...",
      "Extracting public metadata...",
      "Analyzing Tone of Voice...",
      "Identifying topics...",
      "Calibrating model...",
      "Finalizing strategy..."
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
    <div className="bg-slate-900 rounded-xl p-3 font-mono text-[9px] text-green-400 border border-slate-800 shadow-inner mt-4 h-32 overflow-y-auto custom-scrollbar">
      {logs.map((log, i) => (
        <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-300 mb-1">
          <span className="opacity-50 mr-2">{new Date().toLocaleTimeString().split(' ')[0]}</span>
          <span className="text-violet-400 mr-2">{'>'}</span>
          {log}
        </div>
      ))}
      {analyzing && (
        <div className="mt-1 animate-pulse">
           <span className="text-violet-400 mr-2">{'>'}</span>
           <span className="w-2 h-4 bg-green-400 inline-block align-middle"></span>
        </div>
      )}
    </div>
  );
};

const SettingsModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    profile: UserProfile | null;
    onChannelConnect: (c: LinkedChannel) => void;
    onChannelDisconnect: () => void;
    defaultChannelUrl?: string; // Add prop
}> = ({ isOpen, onClose, profile, onChannelConnect, onChannelDisconnect, defaultChannelUrl }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-6 relative animate-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors">
                    <X size={20} />
                </button>
                
                <h2 className="text-xl font-display font-black text-slate-900 mb-6">Channel Settings</h2>

                {!profile?.linkedChannel ? (
                     <TelegramSettings 
                        botToken={TELEGRAM_BOT_TOKEN} 
                        defaultChannelUrl={defaultChannelUrl} // Pass it here
                        linkedChannel={undefined}
                        onChannelConnect={(c) => { onChannelConnect(c); onClose(); }} // Close modal on connect logic
                        onChannelDisconnect={onChannelDisconnect}
                    />
                ) : (
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center gap-4">
                            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-violet-600 shadow-sm border border-slate-100">
                                <MessageCircle size={32} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-slate-900 truncate">{profile.linkedChannel.title}</h3>
                                <a href={`https://t.me/${profile.linkedChannel.username.replace('@','')}`} target="_blank" className="text-sm font-medium text-violet-500 hover:underline">
                                    @{profile.linkedChannel.username.replace('@','')}
                                </a>
                            </div>
                            <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
                                Active
                            </div>
                        </div>
                        
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-500">
                            Bot Token: <span className="font-mono bg-slate-200 px-1 rounded text-slate-700">{profile.linkedChannel.botToken ? `${profile.linkedChannel.botToken.substr(0,10)}...` : 'Using Demo Bot'}</span>
                        </div>

                        <button 
                            onClick={onChannelDisconnect} 
                            className="w-full py-4 text-rose-500 font-bold bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-100"
                        >
                            Disconnect Channel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const GenerationLoading: React.FC<{ state: PipelineState }> = ({ state }) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center space-y-8 p-12">
            <div className="relative">
                <div className="absolute inset-0 bg-violet-500 blur-2xl opacity-20 animate-pulse rounded-full"></div>
                <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center relative z-10 border border-slate-100">
                    <Loader2 size={40} className="text-violet-600 animate-spin" />
                </div>
            </div>
            
            <div className="text-center space-y-2 max-w-sm">
                <h3 className="text-xl font-bold text-slate-900">Creating Content</h3>
                <p className="text-slate-500 font-medium animate-pulse">{state.stage === 'idle' ? 'Initializing...' : state.stage === 'generating_content' ? 'Constructing narrative...' : state.stage === 'polishing' ? 'Applying finishing touches...' : 'Validating output...'}</p>
            </div>

            <div className="w-full max-w-xs bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                    className="h-full bg-violet-600 transition-all duration-500 ease-out"
                    style={{ width: `${state.progress}%` }}
                ></div>
            </div>
        </div>
    );
};


const App: React.FC = () => {
  // --- AUTH & USER STATE ---
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
      goal: parsed?.goal || PostGoal.INFORM,
      format: PostFormat.LIST, // Default
      userComments: '', // Default unused
      withImage: false 
    };
  });
  
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [currentPost, setCurrentPost] = useState<Post | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [pipelineState, setPipelineState] = useState<PipelineState>({ stage: 'idle', progress: 0 });
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPositioningModal, setShowPositioningModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');

  // --- WORKSPACE STATE ---
  const [viewMode, setViewMode] = useState<'workspace' | 'editor'>('workspace');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [postProjects, setPostProjects] = useState<PostProject[]>([]);
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
  const [currentProject, setCurrentProject] = useState<PostProject | null>(null);
  const [showCreateBrandModal, setShowCreateBrandModal] = useState(false);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);

  // --- REFS ---
  const lastAnalyzedUrlRef = useRef('');

  // --- INIT AUTH ---
  useEffect(() => {
    let unsubscribe: () => void;
    const initAuth = async () => {
      const { auth } = await import('./services/firebaseConfig');
      const { onAuthStateChanged, isSignInWithEmailLink, signInWithEmailLink, getRedirectResult } = await import('firebase/auth');

      // Email Link Handling
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) email = window.prompt('Пожалуйста, подтвердите вашу почту для входа:');
        if (email) {
            try {
                await signInWithEmailLink(auth, email, window.location.href);
                window.localStorage.removeItem('emailForSignIn');
                window.history.replaceState({}, '', window.location.pathname);
            } catch (e: any) {
                setError("Ошибка входа по ссылке: " + e.message);
            }
        }
      }

      // Redirect Handling
      try { await getRedirectResult(auth); } catch (e: any) { setError("Ошибка входа: " + e.message); }
      
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const newUser: User = {
            id: firebaseUser.uid,
            first_name: firebaseUser.displayName || 'User',
            avatar: firebaseUser.photoURL || undefined
          };
          setUser(newUser);
          setShowLogin(false);
          try {
            const { UserService } = await import('./services/userService');
            const userProfile = await UserService.syncProfile(firebaseUser.uid);
            setProfile(userProfile);
          } catch (e) {
             console.error("Profile sync error", e);
          }
        } else {
          setUser(null);
          setProfile(null);
          setShowLogin(true);
        }
      });
    };
    initAuth();
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // --- SYNC STRATEGY ---
  useEffect(() => {
    if (profile?.linkedChannel && (!strategy.channelUrl || !strategy.analyzedChannel)) {
      const channelUrl = `https://t.me/${profile.linkedChannel.username.replace('@', '')}`;
      setStrategy(prev => ({ ...prev, channelUrl }));
    }
  }, [profile?.linkedChannel]);

  useEffect(() => {
    if (strategy.channelUrl.trim()) localStorage.setItem('telegenie_strategy_v11', JSON.stringify(strategy));
  }, [strategy]);

  // --- LOAD WORKSPACE (BRANDS + POSTS) ---
  useEffect(() => {
    if (!user) return;
    const loadWorkspace = async () => {
      setLoadingWorkspace(true);
      try {
        const [loadedBrands, loadedPosts] = await Promise.all([
          BrandService.getBrands(user.id),
          PostProjectService.getProjects(user.id)
        ]);
        setBrands(loadedBrands);
        setPostProjects(loadedPosts);
      } catch (e) {
        console.error('Failed to load workspace:', e);
      } finally {
        setLoadingWorkspace(false);
      }
    };
    loadWorkspace();
  }, [user?.id]);

  // --- PERSISTENCE ---
  
  // Ref for debouncing save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Direct save handler (debounced)
  const handleContentChange = (newHtml: string) => {
    // 1. Update local state immediately
    setCurrentPost(prev => prev ? ({ ...prev, text: newHtml }) : null);
    
    // 2. Schedule save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    setIsSaving(true);
    saveTimeoutRef.current = setTimeout(async () => {
        if (!user || !currentProject) return;
        
        try {
            await PostProjectService.updateContent(
                user.id, 
                currentProject.id, 
                newHtml,
                currentPost?.rawText || '', // Preserve raw text if possible, or use empty
                currentPost?.imageUrl
            );
            
            // Sync list state silently
            setPostProjects(prev => prev.map(p => p.id === currentProject.id ? { ...p, text: newHtml, updatedAt: Date.now() } : p));
            setIsSaving(false);
        } catch (e) {
            console.error("Auto-save failed:", e);
            setIsSaving(false); // Should probably show error state
        }
    }, 1000); // 1s debounce
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // --- ACTIONS ---
  const handleLogout = async () => {
    const { auth } = await import('./services/firebaseConfig');
    await auth.signOut();
  };

  // ... (handleChannelConnect / Disconnect remain same) ...
  const handleChannelConnect = async (channel: LinkedChannel) => {
    if (!profile) return;
    const { UserService } = await import('./services/userService');
    const updated = { ...profile, linkedChannel: channel };
    await UserService.updateProfile(updated);
    setProfile(updated);
  };

  const handleChannelDisconnect = async () => {
      if (!profile) return;
      const { UserService } = await import('./services/userService');
      const updated = { ...profile, linkedChannel: undefined };
      await UserService.updateProfile(updated);
      setProfile(updated);
  };
  // ...

  // ... (Workspace Actions remain same) ...

  const handleSelectIdea = async (idea: Idea) => {
    if (!profile || profile.balance <= 0) return setError("Недостаточно кредитов");
    if (!currentProject) return setError("Проект не выбран");

    setError(null);
    setCurrentPost({ id: currentProject.id, text: '', generating: true, timestamp: Date.now() });
    setPipelineState({ stage: 'validating', progress: 5, currentTask: 'Booting...' });

    const config: GenerationConfig = { withImage: strategy.withImage || false, withAnalysis: false };
    const result = await PostGenerationService.generate(
        { idea, strategy, config, userId: user!.id }, 
        setPipelineState,
        (partialText) => {
            // STREAMING UPDATE
            // This updates the UI in real-time
            // AND triggers the auto-save useEffect (debounced)
            setCurrentPost(prev => prev ? { ...prev, text: partialText } : { 
                id: currentProject.id, 
                text: partialText, 
                generating: true, 
                timestamp: Date.now() 
            });
        }
    );

    if (!result.success || !result.post) {
      setError(result.errors.join(', '));
      setCurrentPost(null);
      return;
    }

    const newPost = result.post;
    // Overwrite the project ID because generate returns a new random ID usually, but we are working on a specific project
    newPost.id = currentProject.id;
    
    setCurrentPost(newPost);
    
    // SAVE TO FIRESTORE IMMEDIATELY
    if (user) {
        await PostProjectService.updateIdeas(user.id, currentProject.id, ideas, idea.id);
        await PostProjectService.updateContent(user.id, currentProject.id, newPost.text, newPost.rawText, newPost.imageUrl);
        // Update local project list to reflect changes immediately
        setPostProjects(prev => prev.map(p => p.id === currentProject.id ? { ...p, text: newPost.text, ideas, selectedIdeaId: idea.id, updatedAt: Date.now() } : p));
    }

    try {
        const { UserService } = await import('./services/userService');
        const updated = { ...profile, balance: profile.balance - result.costs.total, generationHistory: [newPost, ...profile.generationHistory].slice(0, 50) };
        await UserService.updateProfile(updated);
        setProfile(updated);
    } catch (e) { console.error(e); }
  };

  const handleAIEdit = async (instruction: string) => {
    if (!currentPost || currentPost.generating || !user || !currentProject) return;
    
    setPipelineState({ stage: 'polishing', progress: 50, currentTask: 'Редактирую...' });
    try {
      const result = await GeminiService.polishContent(currentPost.text, instruction, strategy);
      const updatedText = result.text;
      
      setCurrentPost(p => p ? { ...p, text: updatedText } : null);
      
      // SAVE TO FIRESTORE
      await PostProjectService.updateContent(user.id, currentProject.id, updatedText, currentPost.rawText, currentPost.imageUrl);
       // Update local project list
      setPostProjects(prev => prev.map(p => p.id === currentProject.id ? { ...p, text: updatedText, updatedAt: Date.now() } : p));

      setEditPrompt('');
    } catch (e: any) {
      setError(e.message || 'Ошибка редактирования');
    } finally {
      setPipelineState({ stage: 'idle', progress: 0 });
    }
  };

  const handlePublish = async () => {
    if (!currentPost || !profile || !currentProject) return;
    const chatId = profile.linkedChannel?.chatId || TELEGRAM_CHAT_ID;
    const token = profile.linkedChannel?.botToken || TELEGRAM_BOT_TOKEN;
    
    if (!chatId) return setError("Нет подключенного канала");
    
    setPublishing(true);
    try {
        const res = await TelegramService.publish(currentPost.text, token, chatId, currentPost.imageUrl);
        if (res.success) {
            alert("Опубликовано!");
            
            // SAVE STATUS TO FIRESTORE
            if (user) {
                await PostProjectService.markPublished(user.id, currentProject.id, res.messageId); 
                // Update local list
                setPostProjects(prev => prev.map(p => p.id === currentProject.id ? { ...p, status: 'published', publishedAt: Date.now() } : p));
            }

            const { UserService } = await import('./services/userService');
            const updatedHist = profile.generationHistory.map(p => p.id === currentPost.id ? { ...p, publishedAt: Date.now() } : p);
            const updatedProfile = { ...profile, generationHistory: updatedHist };
            await UserService.updateProfile(updatedProfile);
            setProfile(updatedProfile);
        } else {
            alert(res.message);
        }
    } catch (e: any) { alert(e.message); }
    finally { setPublishing(false); }
  };
  const handleCreateBrand = async (data: {name: string, channelUrl: string}) => {
    if (!user) return;
    const brand = await BrandService.createBrand(user.id, data);
    setBrands(prev => [brand, ...prev]);
    setCurrentBrand(brand);
    // Open positioning modal immediately for the new brand
    handleEditPositioning(brand);
  };

  const handleSelectPost = async (post: PostProject) => {
    const brand = brands.find(b => b.id === post.brandId);
    if (!brand) return;
    
    setCurrentBrand(brand);
    setCurrentProject(post);
    setViewMode('editor');
    
    // Sync to old state model for compatibility
    setStrategy(prev => ({
      ...prev,
      channelUrl: brand.channelUrl,
      goal: post.goal,
      positioning: brand.positioning,
      analyzedChannel: brand.analyzedChannel
    }));
    setIdeas(post.ideas);
    setIdeas(post.ideas);
    
    // Always open the post, even if text is empty (it might be a draft)
    setCurrentPost({
      id: post.id,
      text: post.text || '', // Default to empty string
      rawText: post.rawText,
      imageUrl: post.imageUrl,
      generating: false,
      timestamp: post.updatedAt || Date.now()
    });
    
    // Sync with Firestore to ensure fresh content (fix for stale list state)
    if (user) {
        PostProjectService.getProject(user.id, post.id).then(freshPost => {
            if (freshPost) {
                // Update editor context with fresh data
                setCurrentPost({
                    id: freshPost.id,
                    text: freshPost.text || '',
                    rawText: freshPost.rawText,
                    imageUrl: freshPost.imageUrl,
                    generating: false,
                    timestamp: freshPost.updatedAt
                });
                // Update list state to prevent future staleness
                setPostProjects(prev => prev.map(p => p.id === freshPost.id ? freshPost : p));
                // Update ideas context
                setIdeas(freshPost.ideas);
            }
        }).catch(err => console.error("Failed to refresh post:", err));
    }
  };

  const handleCreatePost = async (brandId: string) => {
    if (!user) return;
    const brand = brands.find(b => b.id === brandId);
    if (brand) setStrategy(s => ({...s, channelUrl: brand.channelUrl, positioning: brand.positioning}));
    
    const project = await PostProjectService.createProject(user.id, brandId, strategy.goal);
    setPostProjects(prev => [project, ...prev]);
    await handleSelectPost(project);
  };

  const handleEditPositioning = (brand: Brand) => {
    setCurrentBrand(brand); // Ensure this brand is active context
    // Update strategy context for the modal
    setStrategy(s => ({
        ...s, 
        channelUrl: brand.channelUrl,
        positioning: brand.positioning
    }));
    setShowPositioningModal(true);
  };

  const handleUpdateBrandPositioning = async (pos: string) => {
    if (!user || !currentBrand) return;
    
    // 1. Update in Firestore
    await BrandService.updatePositioning(user.id, currentBrand.id, pos);
    
    // 2. Update local state
    const updatedBrand = { ...currentBrand, positioning: pos };
    setBrands(prev => prev.map(b => b.id === currentBrand.id ? updatedBrand : b));
    setCurrentBrand(updatedBrand);
    
    // 3. Update strategy if we are in editor or just to keep sync
    setStrategy(s => ({ ...s, positioning: pos }));
  };

  const handleEditBrand = (brand: Brand) => {
    setCurrentBrand(brand);
    setShowSettings(true);
  };

  const handleBackToWorkspace = () => {
    setViewMode('workspace');
    setCurrentProject(null);
  };

  const handleGenerateIdeas = async () => {
    if (!strategy.channelUrl) return;
    setIdeas([]);
    setLoadingIdeas(true);
    setError(null);
    try {
      let currentStrategy = strategy;
      // Re-analyze if needed
      if (!strategy.analyzedChannel || strategy.channelUrl !== lastAnalyzedUrlRef.current) {
        setAnalyzing(true);
        const { info, usage } = await GeminiService.analyzeChannel(strategy.channelUrl);
        currentStrategy = { ...strategy, analyzedChannel: info, analysisUsage: usage };
        setStrategy(currentStrategy);
        lastAnalyzedUrlRef.current = strategy.channelUrl;
        setAnalyzing(false);
      }
      const { ideas: generated, usage } = await GeminiService.generateIdeas(currentStrategy);
      const withUsage = generated.map(i => ({ ...i, usage }));
      setIdeas(withUsage);
    } catch (e: any) {
        setError(e.message || "Ошибка генерации идей");
        setAnalyzing(false);
    } finally {
        setLoadingIdeas(false);
    }
  };



  // --- RENDER ---
  if (showLogin) {
    return (
      <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center">
        <div className="absolute inset-0 bg-white/90 backdrop-blur-xl"></div>
        <div className="relative z-10 max-w-md w-full text-center space-y-8">
            <h1 className="font-display text-5xl font-black uppercase tracking-tighter text-slate-900">TeleGenie</h1>
            <div className="bg-white/50 p-8 rounded-[2rem] backdrop-blur shadow-2xl border border-white/50">
                <Auth onLogin={() => {}} />
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* SETTINGS MODAL */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        profile={profile}
        onChannelConnect={handleChannelConnect}
        onChannelDisconnect={handleChannelDisconnect}
        defaultChannelUrl={CHANNEL_URL} // Pass actual constant
      />

      {/* 1. TOP BAR */}
      <header className="h-16 bg-white border-b border-slate-200 shrink-0 px-6 flex items-center justify-between z-20 shadow-sm relative">
        <div className="flex items-center gap-4">
            {viewMode === 'editor' && (
              <button 
                onClick={handleBackToWorkspace}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors text-xs font-medium"
              >
                <LayoutGrid size={14} />
                Workspace
              </button>
            )}
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-xs">TG</div>
            <h1 className="font-display font-bold text-lg tracking-tight text-slate-900">TeleGenie <span className="text-slate-400 font-medium">Studio</span></h1>
            {currentBrand && viewMode === 'editor' && (
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
                <span>·</span>
                <span className="font-medium text-violet-600">{currentBrand.name}</span>
              </div>
            )}
        </div>
        <div className="flex items-center gap-4">
             {profile && (
                 <>
                    {/* Settings Trigger */}
                    <button 
                        onClick={() => setShowSettings(true)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900"
                    >
                         {profile.linkedChannel ? (
                             <>
                                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                <span className="text-xs font-bold truncate max-w-[100px]">{profile.linkedChannel.title}</span>
                             </>
                         ) : (
                             <>
                                <div className="w-2 h-2 rounded-full bg-rose-400"></div>
                                <span className="text-xs font-bold">No Channel</span>
                             </>
                         )}
                         <Settings size={14} />
                    </button>

                    <div className="w-px h-4 bg-slate-200"></div>

                    <div className="hidden sm:flex items-center gap-3 bg-slate-50 py-1.5 px-3 rounded-full border border-slate-100">
                        <button 
                            onClick={() => setShowSubscriptionModal(true)}
                            className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            {profile.subscription?.tier === 'pro' || profile.subscription?.tier === 'agency' ? 'Plan' : 'Upgrade'}
                        </button>
                        <span className="text-xs font-bold text-slate-500 uppercase">{profile.subscription?.tier || 'Free'}</span>
                        <div className="w-px h-3 bg-slate-200"></div>
                        <span className="text-xs font-bold text-slate-500">${profile.balance.toFixed(2)}</span>
                        <div className="w-px h-3 bg-slate-200"></div>
                        {user?.avatar ? <img src={user.avatar} className="w-5 h-5 rounded-full" /> : <div className="w-5 h-5 bg-violet-500 rounded-full text-[10px] text-white flex items-center justify-center">{user?.first_name[0]}</div>}
                    </div>
                    
                    {/* Logout Button */}
                    <button 
                        onClick={handleLogout}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Выйти"
                    >
                        <X size={16} />
                    </button>
                 </>
             )}
             
             {/* Mobile Menu Toggle */}
             <button className="md:hidden p-2" onClick={() => setShowMobileSidebar(!showMobileSidebar)}><Menu /></button>
        </div>
      </header>

      {/* CREATE BRAND MODAL */}
      <CreateBrandModal
        isOpen={showCreateBrandModal}
        onClose={() => setShowCreateBrandModal(false)}
        onSave={handleCreateBrand}
      />

      {/* WORKSPACE VIEW */}
      {viewMode === 'workspace' ? (
        <WorkspaceScreen
          brands={brands}
          posts={postProjects}
          onSelectPost={handleSelectPost}
          onCreatePost={handleCreatePost}
          onCreateBrand={() => setShowCreateBrandModal(true)}
          onEditBrand={handleEditBrand}
          onDeleteBrand={() => {}}
          onOpenPositioning={handleEditPositioning}
          loading={loadingWorkspace}
        />
      ) : (
        <>
          {/* 2. MAIN GRID - EDITOR VIEW */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden relative">
        
        {/* ... */}
        
        {/* LEFT SIDEBAR: CONTEXT, STRATEGY, IDEAS (3 cols) */}
        <aside className={`absolute inset-y-0 left-0 w-80 bg-white border-r border-slate-200 z-10 transform transition-transform md:relative md:transform-none md:w-auto md:col-span-3 lg:col-span-3 flex flex-col overflow-hidden ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
           <div className="p-4 border-b border-slate-100 flex justify-between items-center md:hidden">
               <span className="font-bold uppercase text-xs text-slate-400">Menu</span>
               <button onClick={() => setShowMobileSidebar(false)}><X size={18} /></button>
           </div>
           
           <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
               {/* SECTION: STRATEGY - Scrollable if needed, but compact */}
               <section className="p-4 space-y-4 shrink-0 overflow-y-auto max-h-[50vh] custom-scrollbar border-b border-slate-100">
                     <div>
                         <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-2">
                             <Target size={12} /> Цель поста
                         </h3>
                         <div className="grid grid-cols-2 gap-2">
                              {Object.values(PostGoal).map(g => (
                                  <button 
                                      key={g}
                                      onClick={() => setStrategy(s => ({...s, goal: g}))}
                                      className={`py-2 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${strategy.goal === g ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                  >
                                      {g}
                                  </button>
                              ))}
                         </div>
                     </div>
                     
                     <div>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-2">
                              <LinkIcon size={12} /> Канал
                          </h3>
                          <div className="w-full bg-slate-100/50 border border-slate-200 text-xs font-medium rounded-xl p-3 text-slate-600 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                              <span className="truncate">{strategy.channelUrl || 'Канал не выбран'}</span>
                          </div>
                     </div>

                    {/* Positioning */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                <UserCircle size={10} /> Позиционирование
                            </label>
                            <button 
                                onClick={() => setShowPositioningModal(true)}
                                className="text-[9px] text-violet-600 font-bold hover:underline flex items-center gap-1"
                            >
                                <Wand2 size={10} /> Мастер
                            </button>
                        </div>
                        <textarea
                            value={strategy.positioning || ''}
                            onChange={(e) => setStrategy(s => ({...s, positioning: e.target.value}))}
                            placeholder="Эксперт по..., Предприниматель..."
                            rows={2}
                            className="w-full bg-slate-50 border border-slate-200 text-xs font-medium rounded-xl p-2.5 outline-none focus:border-violet-300 focus:bg-white transition-all placeholder:text-slate-300 resize-none"
                        />
                    </div>

                    {/* Point */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                            <MessageSquareQuote size={10} /> Поинт (Опционально)
                        </label>
                        <textarea
                            value={strategy.point || ''}
                            onChange={(e) => setStrategy(s => ({...s, point: e.target.value}))}
                            placeholder="О чем конкретно пост?"
                            rows={2}
                            className="w-full bg-slate-50 border border-slate-200 text-xs font-medium rounded-xl p-2.5 outline-none focus:border-violet-300 focus:bg-white transition-all placeholder:text-slate-300 resize-none"
                        />
                    </div>

                    <button 
                        onClick={handleGenerateIdeas}
                        disabled={loadingIdeas || !strategy.channelUrl}
                        className="w-full py-3 bg-violet-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-violet-700 transition-all disabled:opacity-50"
                    >
                        {loadingIdeas ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                        {loadingIdeas ? 'Анализирую...' : (strategy.point ? 'Развить Поинт' : 'Придумать Идеи')}
                    </button>
                    
                    {analyzing && <AnalysisTerminal analyzing={analyzing} />}
               </section>

               {/* SECTION: IDEAS - Fills remaining space */}
               {ideas.length > 0 && (
                   <section className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-3">
                            <Zap size={12} /> Идеи ({ideas.length})
                       </h3>
                       <div className="space-y-2">
                           {ideas.map((idea) => (
                               <div 
                                key={idea.id} 
                                onClick={() => handleSelectIdea(idea)}
                                className="group p-3 bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-300 rounded-xl cursor-pointer transition-all active:scale-98"
                               >
                                   <div className="flex gap-2">
                                       <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-300 group-hover:bg-violet-600 shrink-0"></div>
                                       <p className="text-xs font-medium text-slate-700 leading-relaxed group-hover:text-slate-900">
                                           {idea.title} 
                                       </p>
                                   </div>
                               </div>
                           ))}
                       </div>
                   </section>
               )}
           </div>
        </aside>

        {/* CENTER: EDITOR (5 cols) - Full-bleed White Sheet */}
        <main className="md:col-span-5 lg:col-span-6 bg-white flex flex-col h-full">
            {currentPost && currentPost.generating ? (
                // GENERATING STATE
                <GenerationLoading state={pipelineState} />
            ) : currentPost ? (
                // EDITOR STATE - Full-bleed Design
                <div className="flex-1 flex flex-col h-full">
                    {/* Editor Area - Full bleed white sheet */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative">
                        {/* Loading Overlay when AI is editing */}
                        {pipelineState.stage === 'polishing' && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-4 border-violet-100 border-t-violet-600 animate-spin"></div>
                                    <Wand2 className="absolute inset-0 m-auto text-violet-600" size={24} />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-slate-900">Редактирую текст...</p>
                                    <p className="text-xs text-slate-500 mt-1">ИИ применяет ваши изменения</p>
                                </div>
                            </div>
                        )}
                        <div className="flex-1 max-w-2xl mx-auto w-full px-8 py-10">
                            <TipTapEditor 
                                value={currentPost.text} 
                                onChange={handleContentChange}
                            />
                        </div>
                    </div>

                    {/* AI Editing Panel */}
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-3">
                        {/* Quick Style Buttons */}
                        <div className="flex flex-wrap gap-2">
                            {[
                                { label: '✨ Упростить', prompt: 'Упрости текст, сделай проще и понятнее' },
                                { label: '🎯 Строже', prompt: 'Сделай текст более строгим и деловым' },
                                { label: '🎉 Веселее', prompt: 'Добавь юмора и легкости' },
                                { label: '🔥 Короче', prompt: 'Сократи текст вдвое, оставь только суть' },
                                { label: '💡 Добавить CTA', prompt: 'Добавь призыв к действию в конце' },
                            ].map((action) => (
                                <button
                                    key={action.label}
                                    onClick={() => handleAIEdit(action.prompt)}
                                    disabled={pipelineState.stage !== 'idle'}
                                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-all disabled:opacity-50 shadow-sm"
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>

                        {/* Custom Prompt Input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={editPrompt}
                                onChange={(e) => setEditPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && editPrompt && handleAIEdit(editPrompt)}
                                placeholder="Инструкция для ИИ: напиши что изменить..."
                                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-400"
                            />
                            <button
                                onClick={() => editPrompt && handleAIEdit(editPrompt)}
                                disabled={!editPrompt || pipelineState.stage !== 'idle'}
                                className="px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs uppercase tracking-wide transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-violet-200"
                            >
                                <Wand2 size={14} />
                                Применить
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                // IDLE STATE
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                    <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                        <Layout size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Рабочее пространство</h3>
                    <p className="text-sm max-w-xs mt-2">Выбери идею слева, чтобы начать.</p>
                </div>
            )}
        </main>

        {/* RIGHT: PREVIEW & ACTIONS (4 cols) */}
        <aside className="hidden md:flex md:col-span-4 lg:col-span-3 bg-white flex-col border-l border-slate-200">
            <div className="p-4 border-b border-slate-100">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Превью</h3>
            </div>
            
            {/* Full-bleed Preview */}
            <div className="flex-1 bg-[#879bb1] bg-[url('https://web.telegram.org/img/bg_0.png')] flex flex-col overflow-hidden">
                {/* Header - Real Channel Data */}
                <div className="bg-white/95 backdrop-blur-sm p-3 border-b border-black/5 flex items-center gap-3">
                    {profile?.linkedChannel?.photoUrl ? (
                        <img 
                            src={profile.linkedChannel.photoUrl} 
                            alt={profile.linkedChannel.title}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center font-bold text-sm">
                            {profile?.linkedChannel?.title?.[0] || strategy.analyzedChannel?.name?.[0] || 'T'}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                            {profile?.linkedChannel?.title || strategy.analyzedChannel?.name || 'Канал'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                            {profile?.linkedChannel?.memberCount 
                                ? `${profile.linkedChannel.memberCount.toLocaleString('ru-RU')} подписчиков`
                                : 'Подписчики'
                            }
                        </div>
                    </div>
                </div>
                
                {/* Messages - Scrollable */}
                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col justify-end">
                    {currentPost && !currentPost.generating && (currentPost.text || currentPost.imageUrl) ? (
                        <div className="bg-white rounded-2xl p-3 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {currentPost.imageUrl && (
                                <div className="rounded-xl overflow-hidden mb-3">
                                    <img src={currentPost.imageUrl} alt="Post" className="w-full h-auto object-cover" />
                                </div>
                            )}
                            <div 
                               className="text-sm leading-relaxed text-slate-900 break-words prose prose-sm max-w-none prose-p:my-0 prose-p:min-h-[1.5em] prose-p:empty:h-[1.5em]" 
                               dangerouslySetInnerHTML={{ __html: currentPost.text }}
                            />
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                                <span className={`text-[10px] font-bold uppercase tracking-widest transition-opacity ${isSaving ? 'text-violet-500 opacity-100' : 'text-slate-300 opacity-0'}`}>
                                    {isSaving ? 'Saving...' : 'Saved'}
                                </span>
                                <div className="text-[10px] text-slate-400">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4 animate-in fade-in duration-500">
                            {currentPost?.generating ? (
                                <>
                                    <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin"></div>
                                    <p className="text-white/80 font-bold text-sm tracking-wide">Пишу пост...</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/50 border border-white/10">
                                        <Wand2 size={32} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-white/90 font-bold text-sm">Черновик пуст</p>
                                        <p className="text-white/50 text-xs">Начни писать или выбери идею</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="p-4 border-t border-slate-200 bg-white space-y-3">
                <button 
                    onClick={handlePublish}
                    disabled={!currentPost || currentPost.generating || publishing} 
                    className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-200"
                >
                    {publishing ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                    {publishing ? 'Publishing...' : 'Publish to Channel'}
                </button>
            </div>
        </aside>

      </div>
      </>
      )}

      {/* ERROR TOAST */}
      {error && (
        <div className="fixed bottom-6 right-6 bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-100 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-right max-w-md z-50">
            <AlertCircle size={20} className="shrink-0" />
            <div className="text-xs font-bold">{error}</div>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-rose-100 rounded"><X size={14}/></button>
        </div>
      )}

      {/* POSITIONING MODAL */}
      <PositioningModal 
        isOpen={showPositioningModal}
        onClose={() => setShowPositioningModal(false)}
        onSave={(pos) => {
            if (viewMode === 'workspace') {
                handleUpdateBrandPositioning(pos);
            } else {
                setStrategy(s => ({...s, positioning: pos}));
            }
        }}
        channelUrl={strategy.channelUrl}
        currentPositioning={strategy.positioning}
      />

      {/* SUBSCRIPTION MODAL */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        userId={user?.id || ''}
        currentTier={profile?.subscription?.tier || 'free'}
      />

    </div>
  );
};

export default App;
