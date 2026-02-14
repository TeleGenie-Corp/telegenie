import { create } from 'zustand';

interface UIState {
  // --- Modals ---
  showSettings: boolean;
  showPositioningModal: boolean;
  showSubscriptionModal: boolean;
  showVPNModal: boolean;
  showMobileSidebar: boolean;
  showCreateBrandModal: boolean;

  // --- Dark Mode ---
  darkMode: boolean;

  // --- Actions ---
  openSettings: () => void;
  closeSettings: () => void;
  openPositioning: () => void;
  closePositioning: () => void;
  openSubscription: () => void;
  closeSubscription: () => void;
  openVPN: () => void;
  closeVPN: () => void;
  toggleMobileSidebar: () => void;
  openCreateBrand: () => void;
  closeCreateBrand: () => void;
  toggleDarkMode: () => void;
}

const getInitialDarkMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
  if (saved) return saved === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const useUIStore = create<UIState>((set) => ({
  showSettings: false,
  showPositioningModal: false,
  showSubscriptionModal: false,
  showVPNModal: false,
  showMobileSidebar: false,
  showCreateBrandModal: false,
  darkMode: getInitialDarkMode(),

  openSettings: () => set({ showSettings: true }),
  closeSettings: () => set({ showSettings: false }),
  openPositioning: () => set({ showPositioningModal: true }),
  closePositioning: () => set({ showPositioningModal: false }),
  openSubscription: () => set({ showSubscriptionModal: true }),
  closeSubscription: () => set({ showSubscriptionModal: false }),
  openVPN: () => set({ showVPNModal: true }),
  closeVPN: () => set({ showVPNModal: false }),
  toggleMobileSidebar: () => set((s) => ({ showMobileSidebar: !s.showMobileSidebar })),
  openCreateBrand: () => set({ showCreateBrandModal: true }),
  closeCreateBrand: () => set({ showCreateBrandModal: false }),

  toggleDarkMode: () => set((s) => {
    const next = !s.darkMode;
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
    return { darkMode: next };
  }),
}));
