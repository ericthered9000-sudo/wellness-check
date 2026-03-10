import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  role: 'senior' | 'family';
}

interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  isAuthenticated: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      theme: 'light',
      isAuthenticated: false,
      
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setTheme: (theme) => set({ theme }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'wellness-storage',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);