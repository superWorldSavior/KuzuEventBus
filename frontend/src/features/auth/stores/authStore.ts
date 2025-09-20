import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Customer } from "@/entities/customer";
import type { AuthUser } from "../types";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
}

interface AuthActions {
  login: (user: Customer, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<AuthUser>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      error: undefined,

      // Actions
      login: (user: Customer, token: string) => {
        set({
          user: {
            ...user,
            lastLoginAt: new Date().toISOString(),
          } as AuthUser,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: undefined,
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: undefined,
        });
      },

      updateUser: (userData: Partial<AuthUser>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error?: string) => {
        set({ error, isLoading: false });
      },

      clearError: () => {
        set({ error: undefined });
      },
    }),
    {
      name: "kuzu-auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
