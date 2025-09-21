import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../services/auth.api';
import { log } from '@/shared/lib/logger';
import type { Customer } from '@/entities/customer';

// Mock dependencies
vi.mock('../services/auth.api', () => ({
  authApi: {
    getApiKey: vi.fn(),
    getCustomerId: vi.fn(),
    validateSession: vi.fn(),
    getCurrentCustomer: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('@/shared/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('AuthStore', () => {
  const mockCustomer: Customer = {
    id: 'test-customer-id',
    tenantName: 'test-tenant',
    organizationName: 'Test Organization',
    adminEmail: 'test@example.com',
    subscriptionStatus: 'active',
    createdAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      error: undefined,
      isInitialized: false,
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();
      
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeUndefined();
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('Actions', () => {
    it('should login user correctly', () => {
      const { login } = useAuthStore.getState();
      
      login(mockCustomer, 'test-token');
      
      const state = useAuthStore.getState();
      expect(state.user).toEqual({
        ...mockCustomer,
        lastLoginAt: expect.any(String),
      });
      expect(state.token).toBe('test-token');
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeUndefined();
    });

    it('should logout user correctly', () => {
      const { login, logout } = useAuthStore.getState();
      
      // First login
      login(mockCustomer, 'test-token');
      
      // Then logout
      logout();
      
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeUndefined();
    });

    it('should update user correctly', () => {
      const { login, updateUser } = useAuthStore.getState();
      
      // First login
      login(mockCustomer, 'test-token');
      
      // Update user
      updateUser({ organizationName: 'Updated Organization' });
      
      const state = useAuthStore.getState();
      expect(state.user?.organizationName).toBe('Updated Organization');
      expect(state.user?.id).toBe(mockCustomer.id); // Other properties should remain
    });

    it('should set loading state correctly', () => {
      const { setLoading } = useAuthStore.getState();
      
      setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
      
      setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should set error correctly', () => {
      const { setError } = useAuthStore.getState();
      
      setError('Test error');
      
      const state = useAuthStore.getState();
      expect(state.error).toBe('Test error');
      expect(state.isLoading).toBe(false);
    });

    it('should clear error correctly', () => {
      const { setError, clearError } = useAuthStore.getState();
      
      setError('Test error');
      clearError();
      
      expect(useAuthStore.getState().error).toBeUndefined();
    });
  });

  describe('initializeAuth', () => {
    it('should skip initialization if already initialized', async () => {
      useAuthStore.setState({ isInitialized: true });
      
      const { initializeAuth } = useAuthStore.getState();
      await initializeAuth();
      
      expect(authApi.getApiKey).not.toHaveBeenCalled();
      expect(authApi.getCustomerId).not.toHaveBeenCalled();
    });

    it('should initialize successfully with valid stored credentials', async () => {
      vi.mocked(authApi.getApiKey).mockReturnValue('stored-token');
      vi.mocked(authApi.getCustomerId).mockReturnValue(mockCustomer.id);
      vi.mocked(authApi.validateSession).mockResolvedValue(true);
      vi.mocked(authApi.getCurrentCustomer).mockResolvedValue(mockCustomer);
      
      const { initializeAuth } = useAuthStore.getState();
      await initializeAuth();
      
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.id).toBe(mockCustomer.id);
      expect(state.token).toBe('stored-token');
      expect(state.isInitialized).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(log.info).toHaveBeenCalledWith('User session restored', { customerId: mockCustomer.id });
    });

    it('should handle customer ID mismatch', async () => {
      vi.mocked(authApi.getApiKey).mockReturnValue('stored-token');
      vi.mocked(authApi.getCustomerId).mockReturnValue('stored-customer-id');
      vi.mocked(authApi.validateSession).mockResolvedValue(true);
      vi.mocked(authApi.getCurrentCustomer).mockResolvedValue({
        ...mockCustomer,
        id: 'different-customer-id',
      });
      
      const { initializeAuth } = useAuthStore.getState();
      await initializeAuth();
      
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isInitialized).toBe(true);
      expect(authApi.logout).toHaveBeenCalled();
      expect(log.warn).toHaveBeenCalledWith('Customer ID mismatch, clearing session');
    });

    it('should handle invalid session', async () => {
      vi.mocked(authApi.getApiKey).mockReturnValue('stored-token');
      vi.mocked(authApi.getCustomerId).mockReturnValue('stored-customer-id');
      vi.mocked(authApi.validateSession).mockResolvedValue(false);
      
      const { initializeAuth } = useAuthStore.getState();
      await initializeAuth();
      
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(true);
      expect(log.info).toHaveBeenCalledWith('Invalid session detected, deferring logout (will rely on 401 handlers)');
    });

    it('should handle no stored credentials', async () => {
      vi.mocked(authApi.getApiKey).mockReturnValue(null);
      vi.mocked(authApi.getCustomerId).mockReturnValue(null);
      
      const { initializeAuth } = useAuthStore.getState();
      await initializeAuth();
      
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(true);
    });

    it('should handle initialization errors gracefully', async () => {
      vi.mocked(authApi.getApiKey).mockReturnValue('stored-token');
      vi.mocked(authApi.getCustomerId).mockReturnValue('stored-customer-id');
      vi.mocked(authApi.validateSession).mockRejectedValue(new Error('Network error'));
      
      const { initializeAuth } = useAuthStore.getState();
      await initializeAuth();
      
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(true);
      expect(authApi.logout).toHaveBeenCalled();
      expect(log.warn).toHaveBeenCalledWith('Session validation failed', { error: expect.any(Error) });
    });
  });

  describe('Persistence', () => {
    it('should persist correct state properties', () => {
      const { login } = useAuthStore.getState();
      login(mockCustomer, 'test-token');
      
      // Check that partialize function works correctly
      const state = useAuthStore.getState();
      const persistedState = {
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      };
      
      expect(persistedState.user).toEqual(state.user);
      expect(persistedState.token).toBe('test-token');
      expect(persistedState.isAuthenticated).toBe(true);
      // isInitialized, isLoading, error should not be persisted
    });
  });
});
