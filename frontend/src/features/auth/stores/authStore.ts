import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Customer } from "@/entities/customer";
import type { AuthUser } from "../types";
import { authApi } from "../services/auth.api";
import { log } from "@/shared/lib/logger";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
  isInitialized: boolean;
}

interface AuthActions {
  login: (user: Customer, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<AuthUser>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
  clearError: () => void;
  initializeAuth: () => Promise<void>;
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
      isInitialized: false,

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

      initializeAuth: async () => {
        const currentState = get();
        
        // Skip if already initialized
        if (currentState.isInitialized) {
          return;
        }

        set({ isLoading: true, error: undefined });

        try {
          // Check if user has stored credentials
          const storedApiKey = authApi.getApiKey();
          const storedCustomerId = authApi.getCustomerId();

          if (storedApiKey && storedCustomerId) {
            // Validate current session with backend
            const isValid = await authApi.validateSession();
            if (isValid) {
              const customer = await authApi.getCurrentCustomer();
              if (customer && customer.id === storedCustomerId) {
                set({
                  user: {
                    ...customer,
                    lastLoginAt: new Date().toISOString(),
                  } as AuthUser,
                  token: storedApiKey,
                  isAuthenticated: true,
                  isLoading: false,
                  isInitialized: true,
                  error: undefined,
                });
                log.info("User session restored", { customerId: customer.id });
              } else {
                log.warn("Customer ID mismatch, clearing session");
                await authApi.logout();
                set({
                  user: null,
                  token: null,
                  isAuthenticated: false,
                  isLoading: false,
                  isInitialized: true,
                  error: undefined,
                });
              }
            } else {
              // Invalid session, but defer logout to 401 handlers
              log.info("Invalid session detected, deferring logout (will rely on 401 handlers)");
              set({
                isLoading: false,
                isInitialized: true,
              });
            }
          } else {
            // No stored credentials
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
              error: undefined,
            });
          }
        } catch (error) {
          log.warn("Session validation failed", { error });
          await authApi.logout();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
            error: undefined,
          });
        }
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
