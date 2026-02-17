import { create } from 'zustand';
import { ChannelStrategy, Idea, PostGoal, PostFormat } from '../../types';
import { toast } from 'sonner';
import { analyzeChannelAction, generateIdeasAction, generatePostContentAction } from '../../app/actions/gemini';

interface IdeaWithGoal extends Idea {
  goal: PostGoal;
}

interface WidgetState {
  // --- State ---
  url: string;
  point: string;
  isAnalyzing: boolean;
  ideas: IdeaWithGoal[];
  positioning: string;
  analyzedChannel: any | null;
  selectedIdea: IdeaWithGoal | null;
  isGeneratingPost: boolean;
  generatedPost: string;
  isPublishing: boolean;
  publishedUrl: string | null;
  demoCount: number;
  maxDemos: number;

  // --- Actions ---
  setUrl: (url: string) => void;
  setPoint: (point: string) => void;
  generateDemo: () => Promise<void>;
  selectIdea: (idea: IdeaWithGoal) => Promise<void>;
  publishPost: () => Promise<void>;
  reset: () => void;
}

export const useWidgetStore = create<WidgetState>((set, get) => ({
  url: '',
  point: '',
  isAnalyzing: false,
  ideas: [],
  positioning: '',
  analyzedChannel: null,
  selectedIdea: null,
  isGeneratingPost: false,
  generatedPost: '',
  isPublishing: false,
  publishedUrl: null,
  demoCount: typeof window !== 'undefined' ? parseInt(localStorage.getItem('telegenie_demo_count') || '0') : 0,
  maxDemos: 3,

  setUrl: (url) => set({ url }),
  setPoint: (point) => set({ point }),

  generateDemo: async () => {
    const { url, demoCount, maxDemos, point } = get();
    if (!url) return;
    
    if (demoCount >= maxDemos) {
      toast.error('Вы исчерпали лимит демо-попыток. Зарегистрируйтесь для полного доступа!');
      return;
    }

    set({ isAnalyzing: true, ideas: [], selectedIdea: null, generatedPost: '', positioning: '', publishedUrl: null });

    try {
      // 1. Analyze Channel
      const { info } = await analyzeChannelAction(url);
      
      // 2. Generate Ideas
      const strategy: ChannelStrategy = {
        id: 'demo',
        channelUrl: url,
        goal: PostGoal.INFORM,
        format: PostFormat.LIST,
        analyzedChannel: info,
        point: point,
        userComments: ''
      };

      const { ideas } = await generateIdeasAction(strategy);
      
      set({ 
        ideas: ideas.map(i => ({ ...i, goal: PostGoal.INFORM })), 
        positioning: info.topic,
        analyzedChannel: info
      });

      // Increment count
      const nextCount = demoCount + 1;
      set({ demoCount: nextCount });
      localStorage.setItem('telegenie_demo_count', nextCount.toString());

    } catch (e: any) {
      console.error('Demo Generation failed:', e);
      toast.error(e.message || 'Произошла ошибка при анализе.');
    } finally {
      set({ isAnalyzing: false });
    }
  },

  selectIdea: async (idea: IdeaWithGoal) => {
        const { url, point, positioning, analyzedChannel } = get();
        set({ selectedIdea: idea, isGeneratingPost: true, generatedPost: '', publishedUrl: null });

        try {
            const strategy: ChannelStrategy = {
                id: 'demo',
                channelUrl: url,
                goal: idea.goal,
                format: PostFormat.LIST,
                point: point,
                positioning: positioning,
                userComments: '',
                analyzedChannel: analyzedChannel || {
                    name: 'Channel',
                    description: '',
                    topic: positioning,
                    context: 'Expert',
                    lastPosts: []
                }
            };

        const { text } = await generatePostContentAction(idea, strategy);
        set({ generatedPost: text });
    } catch (e: any) {
      console.error('Post generation failed:', e);
      toast.error('Не удалось сгенерировать текст поста.');
    } finally {
      set({ isGeneratingPost: false });
    }
  },

  publishPost: async () => {
    const { generatedPost, url } = get();
    if (!generatedPost) return;

    set({ isPublishing: true });
    try {
      // Import dynamically to avoid loading firebase if not needed (though mapped in vite)
      // Actually we can import at top level, but let's keep it clean
      const { functions } = await import('../../services/firebaseConfig');
      const { httpsCallable } = await import('firebase/functions');
      
      const publishFn = httpsCallable(functions, 'publishDemoPost');
      const result = await publishFn({ text: generatedPost, url });
      
      const data = result.data as { success: boolean, messageId: number, channelId: string };
      if (data.success) {
        // Construct URL: https://t.me/AiKanalishe/123
        const channelUsername = data.channelId.replace('@', '');
        const postUrl = `https://t.me/${channelUsername}/${data.messageId}`;
        set({ publishedUrl: postUrl });
        toast.success('Пост опубликован в демо-канале!');
      }
    } catch (e: any) {
      console.error('Publish failed:', e);
      toast.error('Не удалось опубликовать пост. Попробуйте позже.');
    } finally {
      set({ isPublishing: false });
    }
  },

  reset: () => set({ url: '', point: '', ideas: [], isAnalyzing: false, selectedIdea: null, generatedPost: '', isGeneratingPost: false, positioning: '', analyzedChannel: null, publishedUrl: null, isPublishing: false })
}));
