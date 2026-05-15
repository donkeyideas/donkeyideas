import { create } from 'zustand';
import { User, getMe, logout as apiLogout, hasStoredToken } from '../api/auth';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

  checkAuth: async () => {
    set({ isLoading: true });
    const hasToken = await hasStoredToken();
    if (!hasToken) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    const user = await getMe();
    set({ user, isAuthenticated: !!user, isLoading: false });
  },

  logout: async () => {
    await apiLogout();
    set({ user: null, isAuthenticated: false });
  },
}));
