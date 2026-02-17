import { create } from 'zustand';
import { ChannelStrategy, Idea, Post, PostGoal, PostFormat, PipelineState, GenerationConfig, PostProject } from '../../types';
import { PostGenerationService } from '../../services/postGenerationService';
import { analyzeChannelAction, generateIdeasAction, polishContentAction } from '@/app/actions/gemini';
import { BillingService } from '../../services/billingService';
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
  selectIdea: (idea: Idea) => Promise<void>;
  aiEdit: (instruction: string) => Promise<void>;
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

export const useEditorStore = create<EditorState>((set, get) => ({
  strategy: loadStrategy(),
  analyzing: false,
  ideas: [],
  loadingIdeas: false,
  currentPost: null,
  pipelineState: { stage: 'idle', progress: 0 },
  editPrompt: '',
  editorTab: 'editor',
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
      }

      const { AnalyticsService } = await import('../../services/analyticsService');
      AnalyticsService.log({ name: 'generate_ideas', params: { topic: strategy.channelUrl } });

      const { ideas: generated, usage } = await generateIdeasAction(currentStrategy);
      const withUsage = generated.map((i) => ({ ...i, usage }));
      set({ ideas: withUsage });
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('VPN_REQUIRED')) {
        useUIStore.getState().openVPN();
      } else {
        toast.error(e.message || 'Ошибка генерации идей');
      }
      set({ analyzing: false });
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
      AnalyticsService.log({ name: 'subscription_click', params: { location: 'limit_posts' } });
      useUIStore.getState().openSubscription();
      return;
    }

    set({
      currentPost: { id: currentProject.id, text: '', generating: true, timestamp: Date.now() },
      pipelineState: { stage: 'validating', progress: 5, currentTask: 'Booting...' },
    });

    const config: GenerationConfig = { withImage: strategy.withImage || false, withAnalysis: false };
    const result = await PostGenerationService.generate(
      { idea, strategy, config, userId: user.id },
      (ps) => set({ pipelineState: ps }),
      (partialText) => {
        set((s) => ({
          currentPost: s.currentPost
            ? { ...s.currentPost, text: partialText }
            : { id: currentProject.id, text: partialText, generating: true, timestamp: Date.now() },
        }));
      },
    );

    if (!result.success || !result.post) {
      if (result.errors.some((e: string) => e.includes('VPN_REQUIRED'))) {
        useUIStore.getState().openVPN();
      } else {
        toast.error(result.errors.join(', '));
      }
      set({ currentPost: null });
      return;
    }

    const newPost = result.post;
    newPost.id = currentProject.id;
    set({ currentPost: newPost });

    // SAVE TO FIRESTORE
    await PostProjectService.updateIdeas(user.id, currentProject.id, ideas, idea.id);
    await PostProjectService.updateContent(user.id, currentProject.id, newPost.text, newPost.rawText, newPost.imageUrl);
    useWorkspaceStore.getState().setPostProjects((prev) =>
      prev.map((p) => (p.id === currentProject.id ? { ...p, text: newPost.text, ideas, selectedIdeaId: idea.id, updatedAt: Date.now() } : p)),
    );

    await BillingService.incrementUsage(user.id, 'posts', 1);

    const { AnalyticsService } = await import('../../services/analyticsService');
    AnalyticsService.log({ name: 'generate_post', params: { method: 'idea', topic: idea.title } });

    try {
      const { UserService } = await import('../../services/userService');
      const updated = { ...profile, balance: profile.balance - result.costs.total, generationHistory: [newPost, ...profile.generationHistory].slice(0, 50) };
      await UserService.updateProfile(updated);
      useAuthStore.getState().updateProfile(updated);
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('VPN_REQUIRED')) {
        const { AnalyticsService: AS } = await import('../../services/analyticsService');
        AS.log({ name: 'error_vpn', params: { location: 'generate_post' } });
        useUIStore.getState().openVPN();
        set({ pipelineState: { stage: 'idle', progress: 0 }, currentPost: null });
      }
    }
  },

  // --- AI EDIT ---
  aiEdit: async (instruction: string) => {
    const { currentPost, strategy } = get();
    const user = useAuthStore.getState().user;
    const { currentProject } = useWorkspaceStore.getState();

    if (!currentPost || currentPost.generating || !user || !currentProject) return;

    set({ pipelineState: { stage: 'polishing', progress: 50, currentTask: 'Редактирую...' } });
    try {
      const result = await polishContentAction(currentPost.text, instruction, strategy);
      const updatedText = result.text;

      set((s) => ({
        currentPost: s.currentPost ? { ...s.currentPost, text: updatedText } : null,
        editPrompt: '',
      }));

      await PostProjectService.updateContent(user.id, currentProject.id, updatedText, currentPost.rawText, currentPost.imageUrl);
      useWorkspaceStore.getState().setPostProjects((prev) =>
        prev.map((p) => (p.id === currentProject.id ? { ...p, text: updatedText, updatedAt: Date.now() } : p)),
      );
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('VPN_REQUIRED')) {
        useUIStore.getState().openVPN();
      } else {
        toast.error(e.message || 'Ошибка редактирования');
      }
    } finally {
      set({ pipelineState: { stage: 'idle', progress: 0 } });
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
    const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '';
    const TELEGRAM_CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || '';

    const { currentPost } = get();
    const profile = useAuthStore.getState().profile;
    const user = useAuthStore.getState().user;
    const { currentProject } = useWorkspaceStore.getState();

    if (!currentPost || !profile || !currentProject) return;

    const chatId = profile.linkedChannel?.chatId || TELEGRAM_CHAT_ID;
    const token = profile.linkedChannel?.botToken || TELEGRAM_BOT_TOKEN;
    if (!chatId) { toast.error('Нет подключенного канала'); return; }

    set({ pipelineState: { stage: 'publishing', progress: 80, currentTask: 'Публикация...' } });
    try {
      const { TelegramService } = await import('../../services/telegramService');
      const res = await TelegramService.publish(currentPost.text, token, chatId, currentPost.imageUrl);
      if (res.success) {
        toast.success('Опубликовано!');

        const { AnalyticsService } = await import('../../services/analyticsService');
        AnalyticsService.log({ name: 'publish_telegram', params: { channel_id: chatId } });

        if (user) {
          await PostProjectService.markPublished(user.id, currentProject.id, res.messageId);
          useWorkspaceStore.getState().setPostProjects((prev) =>
            prev.map((p) => (p.id === currentProject.id ? { ...p, status: 'published', publishedAt: Date.now() } : p)),
          );
        }

        const { UserService } = await import('../../services/userService');
        const updatedHist = profile.generationHistory.map((p) => (p.id === currentPost.id ? { ...p, publishedAt: Date.now() } : p));
        const updatedProfile = { ...profile, generationHistory: updatedHist };
        await UserService.updateProfile(updatedProfile);
        useAuthStore.getState().updateProfile(updatedProfile);
        useWorkspaceStore.getState().backToWorkspace();
      } else {
        toast.error(res.message);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      set({ pipelineState: { stage: 'idle', progress: 0 } });
    }
  },
}));
