'use client';

import React, { Suspense, useEffect, useState, lazy } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Loader2, Layout,
  MessageCircle, Send, Wand2, Settings,
  MessageSquareQuote, Check, ShieldCheck
} from 'lucide-react';
import { PostGoal, IMAGE_MODEL_OPTIONS } from '@/types';

// --- Stores ---
import { useAuthStore } from '@/src/stores/authStore';
import { useUIStore } from '@/src/stores/uiStore';
import { useWorkspaceStore } from '@/src/stores/workspaceStore';
import { useEditorStore } from '@/src/stores/editorStore';

// --- Services ---
import { BillingService } from '@/services/billingService';
import { BrandService } from '@/services/brandService';

// --- Components ---
import { AppSidebar } from '@/src/components/AppSidebar';
import { LandingPage } from '@/src/components/LandingPage';
import { GenerationLoading } from '@/src/components/GenerationLoading';
import { ImagePicker } from '@/src/components/ImagePicker';
import { SettingsModal } from '@/src/components/SettingsModal';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';

// --- Lazy Components ---
const TipTapEditor = lazy(() => import('@/src/components/TipTapEditor').then(m => ({ default: m.TipTapEditor })));
const WorkspaceScreen = lazy(() => import('@/src/components/WorkspaceScreen').then(m => ({ default: m.WorkspaceScreen })));
const PositioningModal = lazy(() => import('@/src/components/PositioningModal').then(m => ({ default: m.PositioningModal })));
const SubscriptionModal = lazy(() => import('@/src/components/SubscriptionModal').then(m => ({ default: m.SubscriptionModal })));
const CreateBrandModal = lazy(() => import('@/src/components/CreateBrandModal').then(m => ({ default: m.CreateBrandModal })));
const PublishedPostModal = lazy(() => import('@/src/components/PublishedPostModal').then(m => ({ default: m.PublishedPostModal })));

import { AnimatePresence, motion } from 'framer-motion';
import { pageTransitions } from '@/src/animationTokens';
import { Toaster, toast } from 'sonner';

const CHANNEL_URL = process.env.NEXT_PUBLIC_CHANNEL_URL || 'https://t.me/AiKanalishe';
const LOADING_QUOTES = [
  { text: 'Слова — это всё, что у нас есть.', author: 'Сэмюэл Беккет' },
  { text: 'Начни писать, и остальное придёт само.', author: 'Харуки Мураками' },
  { text: 'Пиши пьяным, редактируй трезвым.', author: 'Эрнест Хемингуэй' },
  { text: 'Нет ничего страшнее чистого листа — и ничего лучше заполненного.', author: 'Виктор Гюго' },
  { text: 'Чтобы написать хорошую книгу, надо сначала написать плохую.', author: 'Энн Ламотт' },
  { text: 'Настоящий писатель тот, кто пишет — а не тот, кто собирается.', author: 'Антон Чехов' },
];
const QUICK_EDIT_COMMANDS = [
  'Сделай короче и плотнее',
  'Добавь личный пример',
  'Сделай сильнее первый абзац',
  'Добавь ясный призыв в конце',
];
const POST_POINT_PRESETS = [
  {
    label: 'Личный опыт',
    value: 'Личный опыт: что произошло, чему научились, какой вывод будет полезен читателю',
  },
  {
    label: 'Разбор ошибки',
    value: 'Разбор ошибки: какую ошибку часто делает аудитория, почему она мешает и как её исправить',
  },
  {
    label: 'Мягкая продажа',
    value: 'Мягкая продажа: какую проблему решает продукт, без давления и с понятной пользой',
  },
];
const POST_INTENT_OPTIONS = [
  {
    label: 'Поделиться мыслью',
    hint: 'личный взгляд, который хочется сохранить',
    goal: PostGoal.ENGAGE,
  },
  {
    label: 'Объяснить',
    hint: 'разложить сложное простыми словами',
    goal: PostGoal.EDUCATE,
  },
  {
    label: 'Продать мягко',
    hint: 'показать пользу без давления',
    goal: PostGoal.SELL,
  },
  {
    label: 'Ответить на боль',
    hint: 'снять частое сомнение аудитории',
    goal: PostGoal.INFORM,
  },
];

function buildEditorialVerdict(text: string, hasImage: boolean) {
  const cleaned = text.trim();
  const words = cleaned ? cleaned.split(/\s+/).length : 0;
  const firstSentence = cleaned.split(/[.!?。]+/)[0]?.trim() || '';
  const hasHook = firstSentence.length > 18 && firstSentence.length < 140;
  const hasSpecifics = /\d|₽|%|км|час|день|месяц|пример|кейс|история/i.test(cleaned);
  const hasQuestion = cleaned.includes('?');
  const hasCTA = /(напишите|пишите|сохраните|проверьте|попробуйте|поделитесь|задайте|приходите|оставьте|смотрите)/i.test(cleaned);
  const checks = [
    { label: hasHook ? 'Есть рабочий хук' : 'Хук можно усилить', ok: hasHook, action: 'Сделай первый абзац сильнее и конкретнее' },
    { label: hasSpecifics ? 'Есть конкретика' : 'Не хватает примера', ok: hasSpecifics, action: 'Добавь один конкретный пример из практики' },
    { label: hasCTA || hasQuestion ? 'Есть финальный импульс' : 'Финал просит действия', ok: hasCTA || hasQuestion, action: 'Добавь мягкий призыв или вопрос в конце' },
    { label: hasImage ? 'Медиа поддерживает пост' : 'Можно без картинки', ok: true },
  ];
  const weakSpots = checks.filter((check) => !check.ok);

  return {
    tone: words < 80 ? 'Короткий пост' : words > 260 ? 'Плотный лонгрид' : 'Хороший объём',
    summary: weakSpots.length === 0
      ? 'Можно выпускать: мысль читается ясно, структура держится.'
      : `Перед публикацией стоит поправить: ${weakSpots.map((check) => check.label.toLowerCase()).join(', ')}.`,
    checks,
    actions: weakSpots.flatMap((check) => check.action ? [check.action] : []).slice(0, 2),
  };
}

// ============================================================
// APP — Pure Orchestration via Zustand Stores
// ============================================================
export default function Home() {
  // --- STORE SELECTORS ---
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const showLogin = useAuthStore(s => s.showLogin);
  const logout = useAuthStore(s => s.logout);
  const connectChannel = useAuthStore(s => s.connectChannel);
  const disconnectChannel = useAuthStore(s => s.disconnectChannel);

  const darkMode = useUIStore(s => s.darkMode);
  const toggleDarkMode = useUIStore(s => s.toggleDarkMode);
  const showSettings = useUIStore(s => s.showSettings);
  const closeSettings = useUIStore(s => s.closeSettings);
  const showPositioningModal = useUIStore(s => s.showPositioningModal);
  const closePositioning = useUIStore(s => s.closePositioning);
  const showSubscriptionModal = useUIStore(s => s.showSubscriptionModal);
  const closeSubscription = useUIStore(s => s.closeSubscription);
  const openSubscription = useUIStore(s => s.openSubscription);
  const showMobileSidebar = useUIStore(s => s.showMobileSidebar);
  const toggleMobileSidebar = useUIStore(s => s.toggleMobileSidebar);
  const showCreateBrandModal = useUIStore(s => s.showCreateBrandModal);
  const _openCreateBrand = useUIStore(s => s.openCreateBrand); // Renamed to avoid conflict
  const openCreateBrand = async () => {
    if (user?.id) {
       // Assuming BillingService is imported or available globally
       const canCreate = await BillingService.checkLimit(user.id, 'brands');
       if (!canCreate) {
           openSubscription(); // Use the existing openSubscription from UI store
           return;
       }
    }
    _openCreateBrand(); // Call the original openCreateBrand from UI store
  };
  const closeCreateBrand = useUIStore(s => s.closeCreateBrand);
  const openSettings = useUIStore(s => s.openSettings);
  const showPublishedPostModal = useUIStore(s => s.showPublishedPostModal);
  const activePublishedPost = useUIStore(s => s.activePublishedPost);
  const closePublishedPost = useUIStore(s => s.closePublishedPost);

  const viewMode = useWorkspaceStore(s => s.viewMode);
  const brands = useWorkspaceStore(s => s.brands);
  const postProjects = useWorkspaceStore(s => s.postProjects);
  const currentBrand = useWorkspaceStore(s => s.currentBrand);
  const loadingWorkspace = useWorkspaceStore(s => s.loadingWorkspace);
  const setCurrentBrand = useWorkspaceStore(s => s.setCurrentBrand);
  const createBrand = useWorkspaceStore(s => s.createBrand);
  const editPositioning = useWorkspaceStore(s => s.editPositioning);
  const updateBrandPositioning = useWorkspaceStore(s => s.updateBrandPositioning);
  const deleteBrand = useWorkspaceStore(s => s.deleteBrand);
  const deletePost = useWorkspaceStore(s => s.deletePost);
  const createPost = useWorkspaceStore(s => s.createPost);
  const backToWorkspace = useWorkspaceStore(s => s.backToWorkspace);

  const strategy = useEditorStore(s => s.strategy);
  const setStrategy = useEditorStore(s => s.setStrategy);
  const currentPost = useEditorStore(s => s.currentPost);
  const pipelineState = useEditorStore(s => s.pipelineState);
  const editPrompt = useEditorStore(s => s.editPrompt);
  const setEditPrompt = useEditorStore(s => s.setEditPrompt);
  const editorTab = useEditorStore(s => s.editorTab);
  const setEditorTab = useEditorStore(s => s.setEditorTab);
  const isSaving = useEditorStore(s => s.isSaving);
  const selectPost = useEditorStore(s => s.selectPost);
  const generateDirect = useEditorStore(s => s.generateDirect);
  const aiEdit = useEditorStore(s => s.aiEdit);
  const undo = useEditorStore(s => s.undo);
  const previousPostText = useEditorStore(s => s.previousPostText);
  const contentChange = useEditorStore(s => s.contentChange);
  const publish = useEditorStore(s => s.publish);
  const postSuggestions = useEditorStore(s => s.postSuggestions);
  const loadingSuggestions = useEditorStore(s => s.loadingSuggestions);

  const [confirmPublish, setConfirmPublish] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(LOADING_QUOTES[0]);
  const [previewTime, setPreviewTime] = useState('');

  // --- INIT: Auth listener + Firestore subscriptions ---
  // --- INIT: Auth listener moved to AuthInitializer ---
  // We just check redirections here


  // Subscribe to workspace data when user logs in
  useEffect(() => {
    if (!user?.id) return;
    const unsub = useWorkspaceStore.getState().subscribe(user.id);
    return unsub;
  }, [user?.id]);

  useEffect(() => {
    setLoadingQuote(LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)]);
  }, []);

  useEffect(() => {
    setPreviewTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, [currentPost?.id, currentPost?.text, currentPost?.imageUrl]);

  // Sync strategy from linked channel
  useEffect(() => {
    if (profile?.linkedChannel && (!strategy.channelUrl || !strategy.analyzedChannel)) {
      const channelUrl = `https://t.me/${profile.linkedChannel.username.replace('@', '')}`;
      setStrategy(prev => ({ ...prev, channelUrl }));
    }
  }, [profile?.linkedChannel]);

  // --- MAIN APP ---

  // --- PAYMENT STATUS HANDLER ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('payment_status') === 'success') {
        const paymentId = localStorage.getItem('pending_payment_id');
        
        if (paymentId) {
             // Dynamically import action to check verification
             import('@/app/actions/payment').then(async ({ verifyPaymentAction }) => {
                 const { auth } = await import('@/services/firebaseConfig');
                 const idToken = await auth.currentUser?.getIdToken();
                 if (!idToken) {
                    toast.error('Нужно войти заново, чтобы проверить оплату.');
                    return;
                 }
                 const result = await verifyPaymentAction(idToken, paymentId);
                 
                 if (result.success) {
                    toast.success('Оплата подтверждена! Тариф обновлен.');
                    localStorage.removeItem('pending_payment_id');
                    
                    // Clear query param
                    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                    window.history.pushState({path:newUrl},'',newUrl);
                    
                    // Refresh profile (force reload to get new claims/subscription status)
                    setTimeout(() => window.location.reload(), 1500);
                 } else {
                     toast.error(`Ошибка проверки: ${result.error}`);
                 }
             });
        }
      }
    }
  }, []);

  // --- AUTH LOGIC ---
  const isLoadingAuth = useAuthStore(s => s.isLoading);
  const router = useRouter();
  const plainPostText = currentPost?.text?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';
  const hasPublishableContent = !!currentPost && !currentPost.generating && (!!plainPostText || !!currentPost.imageUrl);
  const editorialVerdict = hasPublishableContent ? buildEditorialVerdict(plainPostText, !!currentPost?.imageUrl) : null;

  if (isLoadingAuth) {
    const q = loadingQuote;
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f2f5f5]">
        <div className="text-center max-w-md px-8">
          <p className="font-display text-3xl md:text-4xl font-light text-[#233137] leading-snug tracking-tight mb-4">
            «{q.text}»
          </p>
          <p className="text-[#9aaeb5] text-sm">— {q.author}</p>
        </div>
      </div>
    );
  }

  // Show Landing Page for unauthenticated users
  if (!user) {
    return <LandingPage onLogin={() => router.push('/login')} />;
  }



  return (
    <div className="h-screen flex bg-[#F5F4F0] overflow-hidden font-sans text-[#111111]">
      <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-violet-600" size={32} /></div>}>

      {/* MODALS */}
      <SettingsModal
        isOpen={showSettings}
        onClose={closeSettings}
        profile={profile}
        onChannelConnect={connectChannel}
        onChannelDisconnect={disconnectChannel}
        defaultChannelUrl={CHANNEL_URL}
      />
      <CreateBrandModal
        isOpen={showCreateBrandModal}
        onClose={closeCreateBrand}
        onSave={createBrand}
        onAnalysisDone={async (channelUrl, analysis) => {
          const brand = useWorkspaceStore.getState().currentBrand;
          const uid = user?.id;
          if (brand && uid) {
            await BrandService.cacheAnalysis(uid, brand.id, analysis);
          }
        }}
      />

      <PublishedPostModal
        isOpen={showPublishedPostModal}
        onClose={closePublishedPost}
        post={activePublishedPost}
        brand={brands.find(b => b.id === activePublishedPost?.brandId) || null}
      />

      {/* PERSISTENT LEFT SIDEBAR */}
      <AppSidebar
        viewMode={viewMode}
        brands={brands}
        currentBrand={currentBrand}
        user={user}
        profile={profile}
        editorAnalyzedChannel={strategy.analyzedChannel}
        onSelectBrand={(brand) => {
          setCurrentBrand(brand);
          if (viewMode === 'editor') backToWorkspace();
        }}
        onCreateBrand={openCreateBrand}
        onEditBrand={(brand) => { setCurrentBrand(brand); openSettings(); }}
        onDeleteBrand={deleteBrand}
        onAnalysisDone={async (brand, analysis) => {
          const uid = user?.id;
          if (uid) await BrandService.cacheAnalysis(uid, brand.id, analysis);
        }}
        onLogout={logout}
        onOpenSubscription={openSubscription}
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

      {/* ANIMATED ROUTER */}
      <AnimatePresence mode="wait">
        {viewMode === 'workspace' ? (
          <motion.div
            key="workspace"
            initial="initial" animate="animate" exit="exit"
            variants={pageTransitions}
            className="flex-1 flex min-h-0"
          >
            <ErrorBoundary fallbackTitle="Ошибка в рабочем пространстве">
              <WorkspaceScreen
                selectedBrand={currentBrand}
                posts={postProjects}
                onSelectPost={selectPost}
                onCreatePost={createPost}
                onCreateBrand={openCreateBrand}
                onDeletePost={deletePost}
                loading={loadingWorkspace}
              />
            </ErrorBoundary>
          </motion.div>
        ) : (
          <motion.div
            key="editor"
            initial="initial" animate="animate" exit="exit"
            variants={pageTransitions}
            className="flex-1 flex flex-col overflow-hidden"
          >
          <div className="flex-1 flex overflow-hidden relative">
          <ErrorBoundary fallbackTitle="Ошибка в редакторе">

          {/* CENTER: EDITOR */}
          <main className={`${editorTab === 'editor' ? 'flex' : 'hidden'} lg:flex flex-1 bg-white flex-col h-full min-h-0 overflow-hidden`}>
            {currentPost && currentPost.generating ? (
              <GenerationLoading state={pipelineState} />
            ) : currentPost && (currentPost.text || currentPost.imageUrl) ? (
              <div className="flex-1 flex flex-col h-full">
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative min-h-0">
                  {/* AI Editing Overlay */}
                  {pipelineState.stage === 'polishing' && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-violet-100 border-t-violet-600 animate-spin"></div>
                        <Wand2 className="absolute inset-0 m-auto text-violet-600" size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-900">Редактирую текст...</p>
                        <p className="text-xs text-slate-500 mt-1">Применяю ваши изменения</p>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-h-0 flex flex-col">
                    <TipTapEditor
                      value={currentPost.text}
                      onChange={contentChange}
                    />
                  </div>
                </div>

                {/* AI Editing Panel */}
                <div className="px-3 py-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-[#f8fafa] px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[#9aaeb5]">Следующий шаг</div>
                      <div className="text-xs text-[#233137] font-medium truncate">Улучшите текст одной командой или подготовьте публикацию</div>
                    </div>
                    <button
                      onClick={() => setEditorTab('preview')}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-600 hover:border-violet-200 hover:text-violet-700 transition-all"
                    >
                      Предпросмотр
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_EDIT_COMMANDS.map((command) => (
                      <button
                        key={command}
                        onClick={() => aiEdit(command)}
                        disabled={pipelineState.stage !== 'idle'}
                        className="px-2.5 py-1 bg-[#f2f5f5] border border-[#e8e8e8] rounded-lg text-[11px] font-medium text-[#515255] hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-all disabled:opacity-50"
                      >
                        {command}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {loadingSuggestions ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-6 rounded-lg bg-slate-100 animate-pulse" style={{ width: `${72 + i * 16}px` }} />
                      ))
                    ) : postSuggestions.length > 0 ? (
                      postSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => aiEdit(suggestion)}
                          disabled={pipelineState.stage !== 'idle'}
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-all disabled:opacity-50 text-left"
                        >
                          {suggestion}
                        </button>
                      ))
                    ) : null}
                    {previousPostText && (
                      <button
                        onClick={undo}
                        disabled={pipelineState.stage !== 'idle'}
                        className="px-2.5 py-1 bg-stone-100 border border-stone-200 rounded-lg text-[11px] font-medium text-stone-600 hover:border-stone-400 hover:bg-stone-200 transition-all disabled:opacity-50 flex items-center gap-1"
                      >
                        ↩ Отменить
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && editPrompt && aiEdit(editPrompt)}
                      placeholder="Напиши что изменить..."
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-400"
                    />
                    <button
                      onClick={() => editPrompt && aiEdit(editPrompt)}
                      disabled={!editPrompt || pipelineState.stage !== 'idle'}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                    >
                      <Wand2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* COMPOSE SCREEN */
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#f2f5f5]">
                <div className="w-full max-w-md space-y-5 bg-white rounded-2xl p-8 border border-[#e8e8e8] shadow-sm">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-violet-50 text-violet-600 text-[10px] font-black uppercase tracking-widest mb-3">
                      <Sparkles size={11} /> Мастер поста
                    </div>
                    <h3 className="text-xl font-black text-[#233137] tracking-tight">Что выпускаем сегодня?</h3>
                    <p className="text-sm text-[#758084] mt-1 font-light">
                      Дайте одну мысль — TeleGenie соберёт структуру, стиль и готовый текст.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {POST_POINT_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setStrategy(s => ({ ...s, point: preset.value }))}
                        className="rounded-lg border border-[#e8e8e8] bg-[#f8fafa] px-2 py-2 text-[11px] font-bold text-[#515255] hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 transition-all"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[#9aaeb5] mb-2 block">Что должен сделать пост</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {POST_INTENT_OPTIONS.map(intent => (
                        <button
                          key={intent.label}
                          onClick={() => setStrategy(s => ({...s, goal: intent.goal}))}
                          className={`text-left py-2.5 px-3 rounded-lg border transition-all ${
                            strategy.goal === intent.goal
                              ? 'bg-[#233137] text-white border-[#233137]'
                              : 'bg-white text-[#515255] border-[#e8e8e8] hover:border-[#aec2c9]'
                          }`}
                        >
                          <span className="block text-xs font-bold">{intent.label}</span>
                          <span className={`block text-[10px] mt-0.5 ${strategy.goal === intent.goal ? 'text-white/65' : 'text-[#9aaeb5]'}`}>
                            {intent.hint}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Point */}
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[#9aaeb5] mb-2 flex items-center gap-1.5">
                      <MessageSquareQuote size={10} /> О чём пост
                    </label>
                    <textarea
                      value={strategy.point || ''}
                      onChange={(e) => setStrategy(s => ({...s, point: e.target.value}))}
                      placeholder="Например: почему фокус важнее списка задач"
                      rows={3}
                      className="w-full bg-[#f2f5f5] border border-[#e8e8e8] text-sm text-[#233137] rounded-lg p-3 outline-none focus:border-[#aec2c9] focus:bg-white transition-all placeholder:text-[#9aaeb5] resize-none font-light"
                    />
                  </div>

                  {/* With Image Toggle */}
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      strategy.withImage
                        ? 'bg-violet-50 border-violet-200'
                        : 'bg-[#f2f5f5] border-[#e8e8e8] hover:border-[#aec2c9]'
                    }`}
                    onClick={() => setStrategy(s => ({...s, withImage: !s.withImage}))}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                        strategy.withImage ? 'bg-violet-600 text-white' : 'bg-white border border-[#c5d1d6] text-transparent'
                      }`}>
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <span className="text-sm font-medium text-[#233137]">С вложенным изображением</span>
                    </div>
                    <span className="text-[10px] text-[#9aaeb5]">2 варианта</span>
                  </div>

                  {strategy.withImage && (
                    <div className="space-y-3 rounded-lg border border-violet-100 bg-violet-50/70 p-3">
                      <details className="group">
                        <summary className="cursor-pointer list-none text-[10px] uppercase tracking-widest text-violet-500 font-bold flex items-center justify-between">
                          Тонкая настройка картинки
                          <span className="text-violet-300 group-open:rotate-45 transition-transform">+</span>
                        </summary>
                        <div className="mt-3">
                          <label className="text-[10px] uppercase tracking-widest text-violet-500 mb-2 block">Модель изображения</label>
                          <select
                            value={strategy.imageModel || 'flux/dev'}
                            onChange={(e) => setStrategy(s => ({...s, imageModel: e.target.value as any}))}
                            className="w-full bg-white border border-violet-100 text-sm text-[#233137] rounded-lg p-2.5 outline-none focus:border-violet-300"
                          >
                            {IMAGE_MODEL_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label} — {option.description}</option>
                            ))}
                          </select>
                        </div>
                      </details>

                      {strategy.imageModel === 'nano-banana-2' && (
                        <div className="space-y-2">
                          <label className="flex items-start gap-2 text-sm text-[#233137] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!strategy.imageTextEnabled}
                              onChange={(e) => setStrategy(s => ({...s, imageTextEnabled: e.target.checked}))}
                              className="mt-1"
                            />
                            <span>
                              <span className="font-medium">Добавить текст на изображение</span>
                              <span className="block text-[10px] text-[#758084] mt-0.5">
                                Передаёт текстовый промпт для наложения или caption в модель.
                              </span>
                            </span>
                          </label>

                          {strategy.imageTextEnabled && (
                            <textarea
                              value={strategy.imageTextPrompt || ''}
                              onChange={(e) => setStrategy(s => ({...s, imageTextPrompt: e.target.value}))}
                              placeholder="Например: AI без границ"
                              rows={2}
                              className="w-full bg-white border border-violet-100 text-sm text-[#233137] rounded-lg p-2.5 outline-none focus:border-violet-300 resize-none"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={generateDirect}
                    disabled={pipelineState.stage !== 'idle'}
                    className="w-full py-3 bg-[#233137] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#1a2529] transition-all disabled:opacity-50 active:scale-95"
                  >
                    <Sparkles size={15} />
                    Сгенерировать пост
                  </button>
                </div>
              </div>
            )}
          </main>

          {/* RIGHT: PREVIEW & ACTIONS */}
          <aside className={`${editorTab === 'preview' ? 'flex' : 'hidden'} lg:flex lg:w-80 bg-white flex-col shrink-0 min-h-0 overflow-hidden border-l border-slate-100`}>
            {/* Telegram Preview */}
            <div className="flex-1 bg-[#879bb1] bg-[url('https://web.telegram.org/img/bg_0.png')] flex flex-col min-h-0">
              <div className="bg-white/95 backdrop-blur-sm p-3 border-b border-black/5 flex items-center gap-3">
                {/* Channel Link & Avatar */}
                <a 
                  href={
                    (currentBrand?.linkedChannel?.username || profile?.linkedChannel?.username) 
                      ? `https://t.me/${(currentBrand?.linkedChannel?.username || profile?.linkedChannel?.username)?.replace('@', '')}` 
                      : (currentBrand?.linkedChannel?.chatId || profile?.linkedChannel?.chatId)
                        ? `https://t.me/c/${(currentBrand?.linkedChannel?.chatId || profile?.linkedChannel?.chatId)?.toString().replace('-100', '')}`
                        : currentBrand?.channelUrl || '#'
                  } 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity group"
                >
                  {(currentBrand?.linkedChannel?.photoUrl || profile?.linkedChannel?.photoUrl) && !avatarError ? (
                    <img
                      src={currentBrand?.linkedChannel?.photoUrl || profile?.linkedChannel?.photoUrl}
                      alt="Avatar"
                      onError={() => setAvatarError(true)}
                      className="w-10 h-10 rounded-full object-cover border border-black/5"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#9aaeb5] text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {(currentBrand?.name || profile?.linkedChannel?.title)?.[0]?.toUpperCase() || 'A'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate group-hover:text-violet-600 transition-colors">
                      {currentBrand?.linkedChannel?.title || profile?.linkedChannel?.title || currentBrand?.name || 'AI Каналище'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {(currentBrand?.linkedChannel?.memberCount || profile?.linkedChannel?.memberCount)
                        ? `${(currentBrand?.linkedChannel?.memberCount || profile?.linkedChannel?.memberCount)?.toLocaleString('ru-RU')} подписчиков`
                        : 'Демо-канал'
                      }
                    </div>
                  </div>
                </a>
                <button onClick={openSettings} className="p-2 rounded-full hover:bg-black/5 transition-colors text-slate-400 hover:text-slate-600 shrink-0" title="Настройки канала">
                  <Settings size={16} />
                </button>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar min-h-0">
                {currentPost && !currentPost.generating && (currentPost.text || currentPost.imageUrl) ? (
                  <div className="bg-white rounded-2xl p-3 shadow-xl shadow-black/10 animate-in fade-in slide-in-from-bottom-3 duration-500 ring-1 ring-black/5 flex flex-col gap-3 min-h-0">
                    {currentPost.imageUrl && (
                      <div className="rounded-xl overflow-hidden">
                        <img src={currentPost.imageUrl} alt="Post" className="w-full h-auto object-cover" />
                      </div>
                    )}

                    {currentPost.imageUrlOptions && currentPost.imageUrlOptions.length > 0 && (
                      <ImagePicker
                        imageUrl={currentPost.imageUrl}
                        imageUrlOptions={currentPost.imageUrlOptions}
                        imagePrompt={currentPost.imagePrompt}
                        onSelectImage={(url) => useEditorStore.getState().selectImage(url)}
                        onRegenerate={() => useEditorStore.getState().regenerateImages()}
                        regenerating={pipelineState.stage === 'generating_image'}
                      />
                    )}

                    <div className="min-h-0 max-h-[42vh] overflow-y-auto pr-1">
                      <div
                        className="text-sm leading-relaxed text-slate-900 break-words prose prose-sm max-w-none
                          [&_p]:my-0 [&_p]:leading-[1.6] [&_p]:min-h-[1.6em]
                          [&_p:empty]:block [&_p:empty]:min-h-[1.6em]
                          [&_a]:text-[#5e8090] [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-[#233137]"
                        dangerouslySetInnerHTML={{ __html: currentPost.text }}
                      />
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className={`text-[10px] font-bold uppercase tracking-widest transition-opacity ${isSaving ? 'text-violet-500 opacity-100' : 'text-slate-300 opacity-0'}`}>
                        {isSaving ? 'Сохраняю...' : 'Сохранено'}
                      </span>
                      <div className="text-[10px] text-slate-400" suppressHydrationWarning>{previewTime}</div>
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
                          <p className="text-white/90 font-bold text-sm">Черновик ждёт мысль</p>
                          <p className="text-white/50 text-xs">Слева задайте тему — здесь появится Telegram-preview</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Publish Button */}
            <div className="p-4 border-t border-slate-100 bg-white space-y-3">
              {editorialVerdict && (
                <div className="rounded-2xl border border-slate-100 bg-[#f8fafa] p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                      <ShieldCheck size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[#9aaeb5]">Редакторский вердикт</div>
                      <div className="text-sm font-black text-[#233137]">{editorialVerdict.tone}</div>
                      <p className="text-[11px] text-[#758084] leading-relaxed mt-0.5">{editorialVerdict.summary}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {editorialVerdict.checks.map((check) => (
                      <div
                        key={check.label}
                        className={`rounded-lg px-2 py-1.5 text-[10px] font-bold border ${
                          check.ok
                            ? 'bg-white text-emerald-700 border-emerald-100'
                            : 'bg-white text-amber-700 border-amber-100'
                        }`}
                      >
                        {check.ok ? '✓ ' : '• '}{check.label}
                      </div>
                    ))}
                  </div>

                  {editorialVerdict.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {editorialVerdict.actions.map((action) => (
                        <button
                          key={action}
                          onClick={() => aiEdit(action)}
                          disabled={pipelineState.stage !== 'idle'}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-violet-100 text-[11px] font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-50 transition-all"
                        >
                          {action.replace(/^Добавь /, 'Добавить ').replace(/^Сделай /, 'Сделать ')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!(profile?.linkedChannel?.chatId) ? (
                <button
                  onClick={openSettings}
                  className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-violet-300 text-slate-400 hover:text-violet-600 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Settings size={16} />
                  Подключить канал
                </button>
              ) : confirmPublish ? (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-150">
                  <p className="text-xs text-center text-slate-500 font-medium">Опубликовать пост в канал?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmPublish(false)}
                      className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-wide hover:bg-slate-50 transition-all active:scale-95"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => { setConfirmPublish(false); publish(); }}
                      className="flex-1 py-3 bg-gradient-to-r bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                    >
                      <Send size={14} />
                      Да, публикую
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmPublish(true)}
                  disabled={!hasPublishableContent || pipelineState.stage === 'publishing'}
                  className="w-full py-4 bg-gradient-to-r bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-45 disabled:cursor-not-allowed shadow-sm active:scale-95"
                  title={!hasPublishableContent ? 'Сначала напишите или сгенерируйте пост' : undefined}
                >
                  {pipelineState.stage === 'publishing' ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  {pipelineState.stage === 'publishing' ? 'Публикую...' : hasPublishableContent ? 'Опубликовать в канал' : 'Сначала нужен текст'}
                </button>
              )}
            </div>
          </aside>

          </ErrorBoundary>
          </div>

          {/* MOBILE BOTTOM TAB BAR */}
          <div className="lg:hidden flex items-center bg-white shadow-[0_-1px_0_0_#f1f5f9] px-2 py-2 gap-1 shrink-0 safe-area-inset-bottom">
            {[
              { id: 'editor' as const, label: 'Редактор', icon: Layout },
              { id: 'preview' as const, label: 'Публикация', icon: MessageCircle },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setEditorTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                  editorTab === tab.id
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          </motion.div>
        )}
      </AnimatePresence>

      <Toaster position="top-right" richColors closeButton />

      {/* POSITIONING MODAL */}
      <PositioningModal
        isOpen={showPositioningModal}
        onClose={closePositioning}
        onSave={(pos) => {
          if (viewMode === 'workspace') {
            updateBrandPositioning(pos);
          } else {
            setStrategy(s => ({...s, positioning: pos}));
          }
        }}
        channelUrl={strategy.channelUrl}
        currentPositioning={strategy.positioning}
        channelInfo={strategy.analyzedChannel}
        onAnalysisUpdate={async (analysis) => {
          setStrategy(s => ({ ...s, analyzedChannel: analysis }));
          const brand = useWorkspaceStore.getState().currentBrand;
          const uid = user?.id;
          if (brand && uid) {
            await BrandService.cacheAnalysis(uid, brand.id, analysis);
          }
        }}
      />

      {/* SUBSCRIPTION MODAL */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={closeSubscription}
        userId={user?.id || ''}
        currentTier={profile?.subscription?.tier || 'free'}
        profile={profile}
      />

      </div>{/* /MAIN CONTENT */}

      </Suspense>
    </div>
  );
}
