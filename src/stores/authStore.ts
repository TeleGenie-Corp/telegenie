import { create } from 'zustand';
import { User, UserProfile, LinkedChannel } from '../../types';
import { toast } from 'sonner';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  showLogin: boolean;
  isLoading: boolean;

  // --- Actions ---
  init: () => () => void;
  logout: () => Promise<void>;
  connectChannel: (channel: LinkedChannel) => Promise<void>;
  disconnectChannel: () => Promise<void>;
  updateProfile: (profile: UserProfile) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  showLogin: false, // Don't show login by default, wait for loading
  isLoading: true, // Start in loading state

  init: () => {
    let unsubscribe: (() => void) | undefined;

    const run = async () => {
      // Import Firebase Auth dynamically
      const { auth } = await import('../../services/firebaseConfig');
      const { onAuthStateChanged, isSignInWithEmailLink, signInWithEmailLink, getRedirectResult } = await import('firebase/auth');

      // Email Link Handling
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = typeof window !== 'undefined' ? window.localStorage.getItem('emailForSignIn') : null;
        if (!email) email = window.prompt('Пожалуйста, подтвердите вашу почту для входа:');
        if (email) {
          try {
            await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            window.history.replaceState({}, '', window.location.pathname);
          } catch (e: any) {
            toast.error('Ошибка входа по ссылке: ' + e.message);
          }
        }
      }

      // Redirect Handling
      try { await getRedirectResult(auth); } catch (e: any) { toast.error('Ошибка входа: ' + e.message); }

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const newUser: User = {
            id: firebaseUser.uid,
            first_name: firebaseUser.displayName || 'User',
            avatar: firebaseUser.photoURL || undefined,
          };
          
          // Optimistic update
          set({ user: newUser, showLogin: false }); 

          try {
            const { UserService } = await import('../../services/userService');
            const userProfile = await UserService.syncProfile(firebaseUser.uid);
            set({ profile: userProfile, isLoading: false });
          } catch (e) {
            console.error('Profile sync error', e);
            set({ isLoading: false });
          }
        } else {
          set({ user: null, profile: null, showLogin: true, isLoading: false });
        }
      });
    };

    run();
    return () => { if (unsubscribe) unsubscribe(); };
  },

  logout: async () => {
    const { auth } = await import('../../services/firebaseConfig');
    await auth.signOut();
  },

  connectChannel: async (channel: LinkedChannel) => {
    const { profile } = get();
    if (!profile) return;
    const { UserService } = await import('../../services/userService');
    const updated = { ...profile, linkedChannel: channel };
    await UserService.updateProfile(updated);
    set({ profile: updated });
  },

  disconnectChannel: async () => {
    const { profile } = get();
    if (!profile) return;
    const { UserService } = await import('../../services/userService');
    const updated = { ...profile, linkedChannel: undefined };
    await UserService.updateProfile(updated);
    set({ profile: updated });
  },

  updateProfile: (profile: UserProfile) => {
    set({ profile });
  },
}));
