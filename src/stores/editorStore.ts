import { create } from 'zustand';
import { ChannelStrategy, Idea, Post, PostGoal, PostFormat, PipelineState, GenerationConfig, PostProject } from '../../types';
import { PostGenerationService } from '../../services/postGenerationService';
import { analyzeChannelAction, generateIdeasAction, polishContentAction } from '@/app/actions/gemini';
import { BillingService } from '../../services/billingService';
import { BrandService } from '../../services/brandService';
import { PostProjectService } from '../../services/postProjectService';
import { toast } from 'sonner';
import { useAuthStore } from './authStore';
import { useWorkspaceStore } from './workspaceStore';
import { useUIStore } from './uiStore';

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let lastAnalyzedUrl = '';

interface EditorState {
  // --- Strategy ---
  strategy: ChannelStrategy;

  // --- Editor State ---
  analyzing: boolean;
  ideas: Idea[];
  loadingIdeas: boolean;
  currentPost: Post | null;
  previousPostText: string | null;
  pipelineState: PipelineState;
  editPrompt: string;
  editorTab: 'ideas' | 'editor' | 'preview';
  isSaving: boolean;

  // --- Actions ---
  setStrategy: (updater: ChannelStrategy | ((s: ChannelStrategy) => ChannelStrategy)) => void;
  setEditorTab: (tab: 'ideas' | 'editor' | 'preview') => void;
  setEditPrompt: (prompt: string) => void;
  setCurrentPost: (post: Post | null) => void;
  setIdeas: (ideas: Idea[]) => void;

  selectPost: (post: PostProject) => Promise<void>;
  generateIdeas: () => Promise<void>;
  appendIdeas: () => Promise<void>;
  selectIdea: (idea: Idea) => Promise<void>;
  aiEdit: (instruction: string) => Promise<void>;
  undo: () => void;
  contentChange: (newHtml: string) => void;
  publish: () => Promise<void>;
}

const loadStrategy = (): ChannelStrategy => {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('telegenie_strategy_v11') : null;
    const parsed = saved ? JSON.parse(saved) : null;
    return {
      id: parsed?.id || Math.random().toString(36).substr(2, 9),
      channelUrl: parsed?.channelUrl || '',
      goal: parsed?.goal || PostGoal.INFORM,
      format: PostFormat.LIST,
      userComments: '',
      withImage: false,
    };
  } catch {
    return {
      id: Math.random().toString(36).substr(2, 9),
      channelUrl: '',
      goal: PostGoal.INFORM,
      format: PostFormat.LIST,
      userComments: '',
      withImage: false,
    };
  }
};

/**
 * Collect titles of recently published posts for the current brand.
 * Used as "content memory" so AI doesn't repeat topics.
 */
function getRecentPostTitles(): string[] {
  const { postProjects, currentBrand } = useWorkspaceStore.getState();
  if (!currentBrand) return [];

  return postProjects
    .filter((p) => p.brandId === currentBrand.id && p.status === 'published' && p.ideas?.length > 0)
    .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
    .slice(0, 10)
    .map((p) => {
      const selectedIdea = p.ideas.find((i) => i.id === p.selectedIdeaId);
      return selectedIdea?.title || p.ideas[0]?.title || '';
    })
    .filter(Boolean);
}

export const useEditorStore = create<EditorState>((set, get) => ({
  strategy: loadStrategy(),
  analyzing: false,
  ideas: [],
  loadingIdeas: false,
  currentPost: null,
  previousPostText: null,
  pipelineState: { stage: 'idle', progress: 0 },
  editPrompt: '',
  editorTab: 'ideas',
  isSaving: false,

  setStrategy: (updater) => set((s) => {
    const next = typeof updater === 'function' ? updater(s.strategy) : updater;
    if (next.channelUrl.trim()) localStorage.setItem('telegenie_strategy_v11', JSON.stringify(next));
    return { strategy: next };
  }),

  setEditorTab: (tab) => set({ editorTab: tab }),
  setEditPrompt: (prompt) => set({ editPrompt: prompt }),
  setCurrentPost: (post) => set({ currentPost: post }),
  setIdeas: (ideas) => set({ ideas }),

  // --- SELECT POST (from workspace) ---
  selectPost: async (post: PostProject) => {
    const { brands, setCurrentBrand, setCurrentProject, setViewMode } = useWorkspaceStore.getState();
    const brand = brands.find((b) => b.id === post.brandId);
    if (!brand) return;

    if (post.status === 'published') {
        useUIStore.getState().openPublishedPost(post);
        return;
    }

    setCurrentBrand(brand);
    setCurrentProject(post);
    setViewMode('editor');

    set((s) => ({
      strategy: {
        ...s.strategy,
        channelUrl: brand.channelUrl,
        goal: post.goal,
        positioning: brand.positioning,
        analyzedChannel: brand.analyzedChannel,
      },
      ideas: post.ideas,
      currentPost: {
        id: post.id,
        text: post.text || '',
        rawText: post.rawText,
        imageUrl: post.imageUrl,
        generating: false,
        timestamp: post.updatedAt || Date.now(),
      },
    }));

    // Persist strategy
    const { strategy } = get();
    if (strategy.channelUrl.trim()) localStorage.setItem('telegenie_strategy_v11', JSON.stringify(strategy));

    // Sync fresh data from Firestore
    const user = useAuthStore.getState().user;
    if (user) {
      PostProjectService.getProject(user.id, post.id).then((freshPost) => {
        if (freshPost) {
          set({
            currentPost: {
              id: freshPost.id,
              text: freshPost.text || '',
              rawText: freshPost.rawText,
              imageUrl: freshPost.imageUrl,
              generating: false,
              timestamp: freshPost.updatedAt,
            },
            ideas: freshPost.ideas,
          });
          useWorkspaceStore.getState().setPostProjects((prev) =>
            prev.map((p) => (p.id === freshPost.id ? freshPost : p)),
          );
        }
      }).catch((err) => console.error('Failed to refresh post:', err));
    }
  },

  // --- GENERATE IDEAS ---
  generateIdeas: async () => {
    const { strategy } = get();
    if (!strategy.channelUrl) return;

    set({ ideas: [], loadingIdeas: true });
    try {
      let currentStrategy = strategy;
      if (!strategy.analyzedChannel || strategy.channelUrl !== lastAnalyzedUrl) {
        set({ analyzing: true });
        const { info, usage } = await analyzeChannelAction(strategy.channelUrl);
        currentStrategy = { ...strategy, analyzedChannel: info, analysisUsage: usage };
        set({ strategy: currentStrategy, analyzing: false });
        lastAnalyzedUrl = strategy.channelUrl;
        if (currentStrategy.channelUrl.trim()) localStorage.setItem('telegenie_strategy_v11', JSON.stringify(currentStrategy));

        // Persist analysis to brand in Firestore so insights survive sessions
        const user = useAuthStore.getState().user;
        const { currentBrand } = useWorkspaceStore.getState();
        if (user && currentBrand && info) {
          BrandService.cacheAnalysis(user.id, currentBrand.id, info).catch(() => {});
        }
      }

      // Content memory: collect recent published post titles for the current brand
      const recentPostTitles = getRecentPostTitles();

      const { ideas: generated, usage } = await generateIdeasAction(currentStrategy, recentPostTitles);
      const withUsage = generated.map((i) => ({ ...i, usage }));
      set({ ideas: withUsage });

      const { AnalyticsService } = await import('../../services/analyticsService');
      AnalyticsService.trackGenerateIdeas(strategy.channelUrl);
      AnalyticsService.trackIdeaPresented(withUsage.length, strategy.channelUrl);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Ошибка генерации идей');
      set({ analyzing: false });
    } finally {
      set({ loadingIdeas: false });
    }
  },

  // --- APPEND IDEAS (add more without reset) ---
  appendIdeas: async () => {
    const { strategy, ideas: existing } = get();
    if (!strategy.channelUrl) return;

    set({ loadingIdeas: true });
    try {
      // Content memory: recent published titles + current idea titles
      const recentPostTitles = [
        ...getRecentPostTitles(),
        ...existing.map((i) => i.title),
      ];
      const { ideas: generated, usage } = await generateIdeasAction(strategy, recentPostTitles);
      // Filter out duplicates by title
      const existingTitles = new Set(existing.map((i) => i.title.toLowerCase()));
      const fresh = generated
        .filter((i) => !existingTitles.has(i.title.toLowerCase()))
        .map((i) => ({ ...i, usage }));
      set((s) => ({ ideas: [...s.ideas, ...fresh] }));

      const { AnalyticsService } = await import('../../services/analyticsService');
      AnalyticsService.trackGenerateIdeas(strategy.channelUrl);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Ошибка генерации идей');
    } finally {
      set({ loadingIdeas: false });
    }
  },

  // --- SELECT IDEA (generate post) ---
  selectIdea: async (idea: Idea) => {
    const profile = useAuthStore.getState().profile;
    const user = useAuthStore.getState().user;
    const { currentProject } = useWorkspaceStore.getState();
    const { strategy, ideas } = get();

    if (!profile || profile.balance <= 0) { toast.error('Недостаточно кредитов'); return; }
    if (!currentProject) { toast.error('Проект не выбран'); return; }
    if (!user) return;

    const canPost = await BillingService.checkLimit(user.id, 'posts');
    if (!canPost) {
      const { AnalyticsService } = await import('../../services/analyticsService');
      AnalyticsService.trackPaywallHit('editor_select_idea', 'posts');
      useUIStore.getState().openSubscription();
      return;
    }

    const ideaIndex = get().ideas.indexOf(idea);
    const { AnalyticsService: AS } = await import('../../services/analyticsService');
    AS.trackIdeaSelected(ideaIndex, idea.title);

    set({
      currentPost: { id: currentProject.id, text: '', generating: true, timestamp: Date.now() },
      pipelineState: { stage: 'validating', progress: 5, currentTask: 'Booting...' },
      editorTab: 'editor',
      previousPostText: null,
    });

    const config: GenerationConfig = { withImage: strategy.withImage || false, withAnalysis: false };
    
    // Simulate progress updates since Server Actions are opaque
    const progressInterval = setInterval(() => {
      set((s) => {
        if (!s.pipelineState || s.pipelineState.stage === 'idle') return s;
        const stages: Array<PipelineState['stage']> = ['validating', 'generating_content', 'polishing', 'generating_image'];
        const currentIndex = stages.indexOf(s.pipelineState.stage);
        if (currentIndex < stages.length - 1 && s.pipelineState.progress < 90) {
           return { 
             pipelineState: { 
               ...s.pipelineState, 
               stage: stages[currentIndex + (s.pipelineState.progress > 70 ? 1 : 0)],
               progress: Math.min(s.pipelineState.progress + 5, 90),
               currentTask: 'Работаю над текстом...'
             } 
           };
        }
        return s;
      });
    }, 2000);

    try {
      const { generatePostAction } = await import('@/app/actions/gemini');
      const result = await generatePostAction({ idea, strategy, config, userId: user.id });

      clearInterval(progressInterval);

      if (!result.success || !result.post) {
        toast.error(result.errors.join(', '));
        set({ currentPost: null, pipelineState: { stage: 'idle', progress: 0 } });
        return;
      }

      const newPost = result.post;
      newPost.id = currentProject.id;
      set({ 
        currentPost: newPost,
        pipelineState: { stage: 'idle', progress: 0 } 
      });

      // SAVE TO FIRESTORE
      await PostProjectService.updateIdeas(user.id, currentProject.id, ideas, idea.id);
      await PostProjectService.updateContent(user.id, currentProject.id, newPost.text, newPost.rawText, newPost.imageUrl);
      useWorkspaceStore.getState().setPostProjects((prev) =>
        prev.map((p) => (p.id === currentProject.id ? { ...p, text: newPost.text, ideas, selectedIdeaId: idea.id, updatedAt: Date.now() } : p)),
      );

      await BillingService.incrementUsage(user.id, 'posts', 1);

      const { AnalyticsService } = await import('../../services/analyticsService');
      AnalyticsService.trackGeneratePost('idea', !!(newPost.imageUrl), idea.title);

      const { UserService } = await import('../../services/userService');
      const updated = { ...profile, balance: profile.balance - (result.costs?.total || 0), generationHistory: [newPost, ...profile.generationHistory].slice(0, 50) };
      await UserService.updateProfile(updated);
      useAuthStore.getState().updateProfile(updated);
      
    } catch (e: any) {
      clearInterval(progressInterval);
      console.error(e);
      toast.error(e.message || 'Ошибка генерации поста');
      set({ pipelineState: { stage: 'idle', progress: 0 }, currentPost: null });
    }
  },

  // --- AI EDIT ---
  aiEdit: async (instruction: string) => {
    const { currentPost, strategy } = get();
    const user = useAuthStore.getState().user;
    const { currentProject } = useWorkspaceStore.getState();

    if (!currentPost || currentPost.generating || !user || !currentProject) return;

    // Save current text for undo before modifying
    const textBeforeEdit = currentPost.text;

    set({ pipelineState: { stage: 'polishing', progress: 50, currentTask: 'Редактирую...' } });
    try {
      const result = await polishContentAction(currentPost.text, instruction, strategy);
      const { AnalyticsService } = await import('../../services/analyticsService');
      AnalyticsService.trackPostEditedAI(instruction.length);
      const updatedText = result.text;

      set((s) => ({
        currentPost: s.currentPost ? { ...s.currentPost, text: updatedText } : null,
        editPrompt: '',
        previousPostText: textBeforeEdit,
      }));

      await PostProjectService.updateContent(user.id, currentProject.id, updatedText, currentPost.rawText, currentPost.imageUrl);
      useWorkspaceStore.getState().setPostProjects((prev) =>
        prev.map((p) => (p.id === currentProject.id ? { ...p, text: updatedText, updatedAt: Date.now() } : p)),
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Ошибка редактирования');
    } finally {
      set({ pipelineState: { stage: 'idle', progress: 0 } });
    }
  },

  // --- UNDO AI EDIT ---
  undo: () => {
    const { previousPostText, currentPost } = get();
    if (!previousPostText || !currentPost) return;
    set({ currentPost: { ...currentPost, text: previousPostText }, previousPostText: null });

    // Persist undo to Firestore
    const user = useAuthStore.getState().user;
    const { currentProject } = useWorkspaceStore.getState();
    if (user && currentProject) {
      PostProjectService.updateContent(user.id, currentProject.id, previousPostText, currentPost.rawText, currentPost.imageUrl).catch(console.error);
      useWorkspaceStore.getState().setPostProjects((prev) =>
        prev.map((p) => (p.id === currentProject.id ? { ...p, text: previousPostText, updatedAt: Date.now() } : p)),
      );
    }
  },

  // --- CONTENT CHANGE (debounced save) ---
  contentChange: (newHtml: string) => {
    set((s) => ({
      currentPost: s.currentPost ? { ...s.currentPost, text: newHtml } : null,
    }));

    if (saveTimeout) clearTimeout(saveTimeout);
    set({ isSaving: true });

    saveTimeout = setTimeout(async () => {
      const user = useAuthStore.getState().user;
      const { currentProject } = useWorkspaceStore.getState();
      const { currentPost } = get();
      if (!user || !currentProject) return;

      try {
        await PostProjectService.updateContent(
          user.id,
          currentProject.id,
          newHtml,
          currentPost?.rawText || '',
          currentPost?.imageUrl,
        );
        useWorkspaceStore.getState().setPostProjects((prev) =>
          prev.map((p) => (p.id === currentProject.id ? { ...p, text: newHtml, updatedAt: Date.now() } : p)),
        );
        set({ isSaving: false });
      } catch (e) {
        console.error('Auto-save failed:', e);
        set({ isSaving: false });
      }
    }, 1000);
  },

  // --- PUBLISH ---
  publish: async () => {
    const { currentPost } = get();
    const profile = useAuthStore.getState().profile;
    const user = useAuthStore.getState().user;
    const { currentProject } = useWorkspaceStore.getState();

    if (!currentPost || !profile || !currentProject) return;

    const chatId = profile.linkedChannel?.chatId;
    if (!chatId) { toast.error('Нет подключённого канала'); return; }

    set({ pipelineState: { stage: 'publishing', progress: 80, currentTask: 'Публикация...' } });
    try {
      const { publishPostAction } = await import('@/app/actions/telegram');
      const res = await publishPostAction({
        postHtml: currentPost.text,
        chatId,
        customBotToken: profile.linkedChannel?.botToken,
        imageUrl: currentPost.imageUrl,
      });
      if (res.success) {
        const messageId = res.messageId;
        const brand = useWorkspaceStore.getState().currentBrand;
        const lc = brand?.linkedChannel || profile?.linkedChannel;
        
        let postLink = '';
        if (lc?.username) {
            postLink = `https://t.me/${lc.username.replace('@', '')}/${messageId}`;
        } else if (chatId.startsWith('-100')) {
            postLink = `https://t.me/c/${chatId.replace('-100', '')}/${messageId}`;
        }

        toast.success('Опубликовано!', {
            action: postLink ? {
                label: 'Посмотреть',
                onClick: () => window.open(postLink, '_blank')
            } : undefined
        });

        const { AnalyticsService } = await import('../../services/analyticsService');
        AnalyticsService.trackPublish(chatId, !!(currentPost.imageUrl));

        if (user) {
          const channelInfo = {
            chatId: chatId,
            username: lc?.username || profile?.linkedChannel?.username,
            title: lc?.title || profile?.linkedChannel?.title || brand?.name || 'Канал'
          };

          await PostProjectService.markPublished(user.id, currentProject.id, res.messageId, channelInfo);
          
          useWorkspaceStore.getState().setPostProjects((prev) =>
            prev.map((p) => (p.id === currentProject.id ? { 
                ...p, 
                status: 'published', 
                publishedAt: Date.now(),
                publishedMessageId: res.messageId,
                publishedChannel: channelInfo
            } : p)),
          );
        }

        const { UserService } = await import('../../services/userService');
        const updatedHist = profile.generationHistory.map((p) => (p.id === currentPost.id ? { ...p, publishedAt: Date.now() } : p));
        const updatedProfile = { ...profile, generationHistory: updatedHist };
        await UserService.updateProfile(updatedProfile);
        useAuthStore.getState().updateProfile(updatedProfile);
        useWorkspaceStore.getState().backToWorkspace();
      } else {
        toast.error(res.error || 'Ошибка публикации');
      }
    } catch (e: any) {
      const errMsg = e.message || 'Ошибка публикации';
      toast.error(errMsg);
      import('../../services/analyticsService').then(({ AnalyticsService }) => {
        AnalyticsService.trackPublishError(errMsg);
      });
    } finally {
      set({ pipelineState: { stage: 'idle', progress: 0 } });
    }
  },
}));
