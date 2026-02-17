import { create } from 'zustand';
import { Brand, PostProject, ChannelStrategy, PostGoal, PostFormat } from '../../types';
import { BrandService } from '../../services/brandService';
import { PostProjectService } from '../../services/postProjectService';
import { BillingService } from '../../services/billingService';
import { toast } from 'sonner';
import { useAuthStore } from './authStore';
import { useUIStore } from './uiStore';

interface WorkspaceState {
  viewMode: 'workspace' | 'editor';
  brands: Brand[];
  postProjects: PostProject[];
  currentBrand: Brand | null;
  currentProject: PostProject | null;
  loadingWorkspace: boolean;

  // --- Actions ---
  subscribe: (userId: string) => () => void;
  setViewMode: (mode: 'workspace' | 'editor') => void;
  setCurrentBrand: (brand: Brand | null) => void;
  setCurrentProject: (project: PostProject | null) => void;
  setPostProjects: (updater: PostProject[] | ((prev: PostProject[]) => PostProject[])) => void;
  createBrand: (data: { name: string; channelUrl: string }) => Promise<void>;
  editPositioning: (brand: Brand) => void;
  updateBrandPositioning: (pos: string) => Promise<void>;
  deleteBrand: (brandId: string) => Promise<void>;
  createPost: (brandId: string) => Promise<void>;
  backToWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  viewMode: 'workspace',
  brands: [],
  postProjects: [],
  currentBrand: null,
  currentProject: null,
  loadingWorkspace: false,

  subscribe: (userId: string) => {
    set({ loadingWorkspace: true });

    const unsubBrands = BrandService.subscribeToBrands(userId, (brands) => {
      set({ brands, loadingWorkspace: false });
    });

    const unsubProjects = PostProjectService.subscribeToProjects(userId, (projects) => {
      set({ postProjects: projects });
    });

    return () => {
      unsubBrands();
      unsubProjects();
    };
  },

  setViewMode: (mode) => set({ viewMode: mode }),
  setCurrentBrand: (brand) => set({ currentBrand: brand }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setPostProjects: (updater) => set((s) => ({
    postProjects: typeof updater === 'function' ? updater(s.postProjects) : updater,
  })),

  // --- AUTO ANALYZE ---
  autoAnalyzeBrand: async (brand: Brand) => {
    if (brand.analyzedChannel) return;
    const { useEditorStore } = await import('./editorStore');
    await useEditorStore.getState().generateIdeas();
  },

  createBrand: async (data) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    const canAdd = await BillingService.checkLimit(userId, 'brands');
    if (!canAdd) {
      useUIStore.getState().openSubscription();
      return;
    }

    const brand = await BrandService.createBrand(userId, data);
    set({ currentBrand: brand });

    const { AnalyticsService } = await import('../../services/analyticsService');
    AnalyticsService.log({ name: 'create_brand', params: { name: brand.name } });

    // Import editorStore lazily to avoid circular deps
    const { useEditorStore } = await import('./editorStore');
    useEditorStore.getState().setStrategy((s: ChannelStrategy) => ({
      ...s,
      channelUrl: brand.channelUrl,
      positioning: brand.positioning,
    }));
    useUIStore.getState().openPositioning();
  },

  editPositioning: (brand) => {
    set({ currentBrand: brand });
    // Lazy import to avoid circular deps
    import('./editorStore').then(({ useEditorStore }) => {
      useEditorStore.getState().setStrategy((s: ChannelStrategy) => ({
        ...s,
        channelUrl: brand.channelUrl,
        positioning: brand.positioning,
      }));
    });
    useUIStore.getState().openPositioning();
  },

  updateBrandPositioning: async (pos: string) => {
    const userId = useAuthStore.getState().user?.id;
    const { currentBrand } = get();
    if (!userId || !currentBrand) return;

    await BrandService.updatePositioning(userId, currentBrand.id, pos);
    const updatedBrand = { ...currentBrand, positioning: pos };
    set({ currentBrand: updatedBrand });

    const { useEditorStore } = await import('./editorStore');
    useEditorStore.getState().setStrategy((s: ChannelStrategy) => ({ ...s, positioning: pos }));
  },

  deleteBrand: async (brandId: string) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const { brands } = get();
    const brandToDelete = brands.find((b) => b.id === brandId);
    if (!brandToDelete) return;

    try {
      await BrandService.deleteBrand(userId, brandId);
      toast.success(`Бренд "${brandToDelete.name}" удалён`, {
        action: {
          label: 'Отменить',
          onClick: async () => {
            try {
              await BrandService.restoreBrand(userId, brandToDelete);
              toast.success('Восстановлено');
            } catch { toast.error('Не удалось восстановить'); }
          },
        },
        duration: 5000,
      });
    } catch (e: any) {
      toast.error('Не удалось удалить бренд: ' + e.message);
    }
  },

  createPost: async (brandId: string) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const { brands } = get();
    const brand = brands.find((b) => b.id === brandId);

    const { useEditorStore } = await import('./editorStore');
    const editorStore = useEditorStore.getState();

    if (brand) {
      editorStore.setStrategy((s: ChannelStrategy) => ({
        ...s,
        channelUrl: brand.channelUrl,
        positioning: brand.positioning,
      }));
    }

    const project = await PostProjectService.createProject(userId, brandId, editorStore.strategy.goal);
    await editorStore.selectPost(project);
  },

  backToWorkspace: () => {
    set({ viewMode: 'workspace', currentProject: null });
  },
}));
