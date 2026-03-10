'use client';

import React, { Suspense, useEffect, useState, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, Zap, Loader2, Layout, Target,
  MessageCircle, Send, Wand2, Settings,
  MessageSquareQuote
} from 'lucide-react';
import { PostGoal } from '@/types';

// --- Stores ---
import { useAuthStore } from '@/src/stores/authStore';
import { useUIStore } from '@/src/stores/uiStore';
import { useWorkspaceStore } from '@/src/stores/workspaceStore';
import { useEditorStore } from '@/src/stores/editorStore';

// --- Services ---
import { BillingService } from '@/services/billingService';

// --- Components ---
// import { AuthPage } from '@/src/components/AuthPage'; // Removed

import { AppHeader } from '@/src/components/AppHeader';

import { LandingPage } from '@/src/components/LandingPage';
import { GenerationLoading } from '@/src/components/GenerationLoading';
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
import { pageTransitions, listContainer, listItem } from '@/src/animationTokens';
import { Toaster, toast } from 'sonner';

const CHANNEL_URL = process.env.NEXT_PUBLIC_CHANNEL_URL || 'https://t.me/AiKanalishe';

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
  const createPost = useWorkspaceStore(s => s.createPost);
  const backToWorkspace = useWorkspaceStore(s => s.backToWorkspace);

  const strategy = useEditorStore(s => s.strategy);
  const setStrategy = useEditorStore(s => s.setStrategy);
  const analyzing = useEditorStore(s => s.analyzing);
  const ideas = useEditorStore(s => s.ideas);
  const loadingIdeas = useEditorStore(s => s.loadingIdeas);
  const currentPost = useEditorStore(s => s.currentPost);
  const pipelineState = useEditorStore(s => s.pipelineState);
  const editPrompt = useEditorStore(s => s.editPrompt);
  const setEditPrompt = useEditorStore(s => s.setEditPrompt);
  const editorTab = useEditorStore(s => s.editorTab);
  const setEditorTab = useEditorStore(s => s.setEditorTab);
  const isSaving = useEditorStore(s => s.isSaving);
  const selectPost = useEditorStore(s => s.selectPost);
  const generateIdeas = useEditorStore(s => s.generateIdeas);
  const appendIdeas = useEditorStore(s => s.appendIdeas);
  const selectIdea = useEditorStore(s => s.selectIdea);
  const aiEdit = useEditorStore(s => s.aiEdit);
  const undo = useEditorStore(s => s.undo);
  const previousPostText = useEditorStore(s => s.previousPostText);
  const contentChange = useEditorStore(s => s.contentChange);
  const publish = useEditorStore(s => s.publish);

  const [confirmPublish, setConfirmPublish] = useState(false);

  // --- INIT: Auth listener + Firestore subscriptions ---
  // --- INIT: Auth listener moved to AuthInitializer ---
  // We just check redirections here


  // Subscribe to workspace data when user logs in
  useEffect(() => {
    if (!user?.id) return;
    const unsub = useWorkspaceStore.getState().subscribe(user.id);
    return unsub;
  }, [user?.id]);

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
                 const result = await verifyPaymentAction(paymentId);
                 
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

  if (isLoadingAuth) {
       return (
          <div className="flex items-center justify-center min-h-screen bg-slate-50">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-violet-600 animate-spin" />
                  <p className="text-slate-400 text-sm font-medium animate-pulse">Загрузка TeleGenie...</p>
              </div>
          </div>
      );
  }

  // Show Landing Page for unauthenticated users
  if (!user) {
    return <LandingPage onLogin={() => router.push('/login')} />;
  }



  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans text-slate-900">
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
      />
      
      <PublishedPostModal
        isOpen={showPublishedPostModal}
        onClose={closePublishedPost}
        post={activePublishedPost}
        brand={brands.find(b => b.id === activePublishedPost?.brandId) || null}
      />

      {/* HEADER */}
      <AppHeader
        viewMode={viewMode}
        user={user}
        profile={profile}
        currentBrand={currentBrand}
        darkMode={darkMode}
        showMobileSidebar={showMobileSidebar}
        onBackToWorkspace={backToWorkspace}
        onToggleDarkMode={toggleDarkMode}
        onLogout={logout}
        onToggleMobileSidebar={toggleMobileSidebar}
        onOpenSubscription={openSubscription}
      />

      {/* ANIMATED ROUTER */}
      <AnimatePresence mode="wait">
        {viewMode === 'workspace' ? (
          <motion.div 
            key="workspace"
            initial="initial" animate="animate" exit="exit"
            variants={pageTransitions}
            className="flex-1 flex flex-col min-h-0"
          >
            <ErrorBoundary fallbackTitle="Ошибка в рабочем пространстве">
              <WorkspaceScreen
                brands={brands}
                posts={postProjects}
                onSelectPost={selectPost}
                onCreatePost={createPost}
                onCreateBrand={openCreateBrand}
                onEditBrand={(brand) => { setCurrentBrand(brand); openSettings(); }}
                onDeleteBrand={deleteBrand}
                onOpenPositioning={editPositioning}
                loading={loadingWorkspace}
              />
            </ErrorBoundary>
          </motion.div>
        ) : (
          <motion.div 
            key="editor"
            initial="initial" animate="animate" exit="exit"
            variants={pageTransitions}
            className="flex-1 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden relative"
          >
          <ErrorBoundary fallbackTitle="Ошибка в редакторе">

          {/* LEFT SIDEBAR: STRATEGY + IDEAS */}
          <aside className={`${editorTab === 'ideas' ? 'flex' : 'hidden'} lg:flex lg:col-span-3 bg-white border-r border-slate-200 flex-col overflow-hidden flex-1 lg:flex-none min-h-0`}>
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* STRATEGY */}
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
                  onClick={generateIdeas}
                  disabled={loadingIdeas || !strategy.channelUrl}
                  className="w-full py-3 bg-violet-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-violet-700 transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-violet-200 hover:shadow-violet-300"
                >
                  {loadingIdeas ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                  {loadingIdeas ? 'Анализирую...' : (strategy.point ? 'Развить Поинт' : 'Придумать Идеи')}
                </button>
               </section>

              {/* IDEAS — Loading */}
              {loadingIdeas && (
                <section className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-3">
                    <Zap size={12} className="animate-pulse" /> Генерация идей...
                  </h3>
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-xl animate-pulse">
                        <div className="flex gap-2">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-200 shrink-0"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* IDEAS — List */}
              {ideas.length > 0 && !loadingIdeas && (
                <section className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Zap size={12} /> Идеи ({ideas.length})
                    </h3>
                    {ideas[0]?.sources && ideas[0].sources.length > 0 && (
                      <span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        🔍 {ideas[0].sources.length} ист.
                      </span>
                    )}
                  </div>
                  <motion.div className="space-y-2" variants={listContainer} initial="hidden" animate="show">
                    <AnimatePresence>
                    {ideas.map((idea) => (
                      <motion.div
                        key={idea.id} variants={listItem} layout
                        onClick={() => selectIdea(idea)}
                        className="group p-3 bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-300 rounded-xl cursor-pointer active:scale-98 hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex gap-2">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-300 group-hover:bg-violet-600 shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 leading-relaxed group-hover:text-slate-900">
                              {idea.title}
                            </p>
                            {idea.userBenefit && (
                              <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                                {idea.userBenefit}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    </AnimatePresence>
                  </motion.div>
                  <button
                    onClick={appendIdeas}
                    disabled={loadingIdeas}
                    className="w-full mt-2 py-2.5 border border-dashed border-slate-300 text-slate-400 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {loadingIdeas ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    Ещё идеи
                  </button>
                </section>
              )}
            </div>
          </aside>

          {/* CENTER: EDITOR */}
          <main className={`${editorTab === 'editor' ? 'flex' : 'hidden'} lg:flex lg:col-span-6 bg-white flex-col h-full flex-1 lg:flex-none min-h-0 overflow-hidden`}>
            {currentPost && currentPost.generating ? (
              <GenerationLoading state={pipelineState} />
            ) : currentPost ? (
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
                        <p className="text-xs text-slate-500 mt-1">ИИ применяет ваши изменения</p>
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
                <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-2.5 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '✨ Упростить', prompt: 'Упрости текст, сделай проще и понятнее' },
                      { label: '🎯 Строже', prompt: 'Сделай текст более строгим и деловым' },
                      { label: '🎉 Веселее', prompt: 'Добавь юмора и легкости' },
                      { label: '🔥 Короче', prompt: 'Сократи текст вдвое, оставь только суть' },
                      { label: '💡 CTA', prompt: 'Добавь призыв к действию в конце' },
                    ].map((action) => (
                      <button
                        key={action.label}
                        onClick={() => aiEdit(action.prompt)}
                        disabled={pipelineState.stage !== 'idle'}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-all disabled:opacity-50"
                      >
                        {action.label}
                      </button>
                    ))}
                    {previousPostText && (
                      <button
                        onClick={undo}
                        disabled={pipelineState.stage !== 'idle'}
                        className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] font-medium text-amber-700 hover:border-amber-400 hover:bg-amber-100 transition-all disabled:opacity-50 flex items-center gap-1"
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
              /* IDLE STATE */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full blur-2xl opacity-20 animate-pulse scale-150"></div>
                  <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-xl shadow-violet-200">
                    <Sparkles size={36} className="text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Выбери идею</h3>
                <p className="text-sm text-slate-500 max-w-xs mt-2 leading-relaxed">
                  Кликни на идею слева, чтобы ИИ превратил её в готовый пост
                </p>
                <div className="flex items-center gap-2 mt-6 text-xs text-slate-400">
                  <div className="w-8 h-0.5 bg-gradient-to-r from-transparent to-slate-200"></div>
                  <span className="uppercase tracking-widest font-bold">или</span>
                  <div className="w-8 h-0.5 bg-gradient-to-l from-transparent to-slate-200"></div>
                </div>
                <p className="text-xs text-slate-400 mt-4">Сгенерируй новые идеи в панели слева</p>
              </div>
            )}
          </main>

          {/* RIGHT: PREVIEW & ACTIONS */}
          <aside className={`${editorTab === 'preview' ? 'flex' : 'hidden'} lg:flex lg:col-span-3 bg-white flex-col border-l border-slate-200 flex-1 lg:flex-none min-h-0 overflow-hidden`}>
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Превью</h3>
            </div>
            
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
                  {(currentBrand?.linkedChannel?.photoUrl || profile?.linkedChannel?.photoUrl) ? (
                    <img 
                      src={currentBrand?.linkedChannel?.photoUrl || profile?.linkedChannel?.photoUrl} 
                      alt="Avatar" 
                      className="w-10 h-10 rounded-full object-cover border border-black/5" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {(currentBrand?.name || profile?.linkedChannel?.title)?.[0] || 'A'}
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
                  <div className="bg-white rounded-2xl p-3 shadow-xl shadow-black/10 animate-in fade-in slide-in-from-bottom-3 duration-500 ring-1 ring-black/5">
                    {currentPost.imageUrl && (
                      <div className="rounded-xl overflow-hidden mb-3">
                        <img src={currentPost.imageUrl} alt="Post" className="w-full h-auto object-cover" />
                      </div>
                    )}
                    <div 
                      className="text-sm leading-relaxed text-slate-900 break-words prose prose-sm max-w-none 
                        prose-p:my-0 prose-p:min-h-[1.4em] 
                        [&_p:empty]:h-[1.4em] [&_p:empty]:block
                        [&_p>br]:h-[1.4em]" 
                      dangerouslySetInnerHTML={{ __html: currentPost.text }} 
                    />
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                      <span className={`text-[10px] font-bold uppercase tracking-widest transition-opacity ${isSaving ? 'text-violet-500 opacity-100' : 'text-slate-300 opacity-0'}`}>
                        {isSaving ? 'Сохраняю...' : 'Сохранено'}
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

            {/* Publish Button */}
            <div className="p-4 border-t border-slate-200 bg-white space-y-3">
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
                      className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-300 active:scale-95"
                    >
                      <Send size={14} />
                      Да, публикую
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmPublish(true)}
                  disabled={!currentPost || currentPost.generating || pipelineState.stage === 'publishing'}
                  className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-300 hover:shadow-violet-400 active:scale-95"
                >
                  {pipelineState.stage === 'publishing' ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  {pipelineState.stage === 'publishing' ? 'Публикую...' : 'Опубликовать в канал'}
                </button>
              )}
            </div>
          </aside>

          </ErrorBoundary>

          {/* MOBILE BOTTOM TAB BAR */}
          <div className="lg:hidden flex items-center bg-white border-t border-slate-200 px-2 py-2 gap-1 shrink-0 safe-area-inset-bottom">
            {[
              { id: 'ideas' as const, label: 'Идеи', icon: Zap },
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
      />

      {/* SUBSCRIPTION MODAL */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={closeSubscription}
        userId={user?.id || ''}
        currentTier={profile?.subscription?.tier || 'free'}
        profile={profile}
      />

      </Suspense>
    </div>
  );
}
