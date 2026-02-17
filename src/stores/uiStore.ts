import { create } from 'zustand';

interface UIState {
  // --- Modals ---
  showSettings: boolean;
  showPositioningModal: boolean;
  showSubscriptionModal: boolean;
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
  toggleMobileSidebar: () => void;
  openCreateBrand: () => void;
  closeCreateBrand: () => void;
  toggleDarkMode: () => void;
}

const getInitialDarkMode = (): boolean => {
  return false; // Disabled
};

export const useUIStore = create<UIState>((set) => ({
  showSettings: false,
  showPositioningModal: false,
  showSubscriptionModal: false,
  showMobileSidebar: false,
  showCreateBrandModal: false,
  darkMode: false,

  openSettings: () => set({ showSettings: true }),
  closeSettings: () => set({ showSettings: false }),
  openPositioning: () => set({ showPositioningModal: true }),
  closePositioning: () => set({ showPositioningModal: false }),
  openSubscription: () => set({ showSubscriptionModal: true }),
  closeSubscription: () => set({ showSubscriptionModal: false }),
  toggleMobileSidebar: () => set((s) => ({ showMobileSidebar: !s.showMobileSidebar })),
  openCreateBrand: () => set({ showCreateBrandModal: true }),
  closeCreateBrand: () => set({ showCreateBrandModal: false }),

  toggleDarkMode: () => {
    // No-op, ensure class is removed just in case
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('dark');
      localStorage.removeItem('theme');
    }
  },
}));
