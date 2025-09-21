import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../services/auth.api';
import type { Customer } from '@/entities/customer';
import type { RegistrationData, LoginCredentials } from '../types';

// Mock dependencies
vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../services/auth.api', () => ({
  authApi: {
    registerCustomer: vi.fn(),
    loginWithCredentials: vi.fn(),
    logout: vi.fn(),
  },
}));

describe('useAuth Hook', () => {
  const mockCustomer: Customer = {
    id: 'test-customer-id',
    tenantName: 'test-tenant',
    organizationName: 'Test Organization',
    adminEmail: 'test@example.com',
    subscriptionStatus: 'active',
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockAuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: undefined,
    isInitialized: false,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    clearError: vi.fn(),
    initializeAuth: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(useAuthStore).mockReturnValue(mockAuthState);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Hook Integration', () => {
    it('should return auth state from store', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeUndefined();
      expect(result.current.isInitialized).toBe(false);
    });

    it('should call initializeAuth when not initialized', () => {
      mockAuthState.isInitialized = false;
      
      renderHook(() => useAuth());
      
      expect(mockAuthState.initializeAuth).toHaveBeenCalled();
    });

    it('should not call initializeAuth when already initialized', () => {
      mockAuthState.isInitialized = true;
      
      renderHook(() => useAuth());
      
      expect(mockAuthState.initializeAuth).not.toHaveBeenCalled();
    });
  });

  describe('Registration', () => {
    it('should handle successful registration', async () => {
      const mockResponse = {
        customer: mockCustomer,
        api_key: 'new-api-key',
      };
      vi.mocked(authApi.registerCustomer).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth());

      const registrationData: RegistrationData = {
        tenantName: 'test-tenant',
        organizationName: 'Test Organization',
        adminEmail: 'test@example.com',
      };

      await act(async () => {
        await result.current.handleRegister(registrationData);
      });

      expect(mockAuthState.setLoading).toHaveBeenCalledWith(true);
      expect(mockAuthState.clearError).toHaveBeenCalled();
      expect(authApi.registerCustomer).toHaveBeenCalledWith({
        tenant_name: registrationData.tenantName,
        organization_name: registrationData.organizationName,
        admin_email: registrationData.adminEmail,
      });
      expect(mockAuthState.login).toHaveBeenCalledWith(mockCustomer, 'new-api-key');
      expect(mockAuthState.setLoading).toHaveBeenCalledWith(false);
    });

    it('should handle registration errors', async () => {
      const mockError = new Error('Registration failed');
      vi.mocked(authApi.registerCustomer).mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth());

      const registrationData: RegistrationData = {
        tenantName: 'test-tenant',
        organizationName: 'Test Organization',
        adminEmail: 'test@example.com',
      };

      await act(async () => {
        await result.current.handleRegister(registrationData);
      });

      expect(mockAuthState.setError).toHaveBeenCalledWith(expect.stringContaining('Registration failed'));
    });
  });

  describe('Login', () => {
    it('should handle successful login', async () => {
      const mockResponse = {
        customer: mockCustomer,
        api_key: 'login-api-key',
      };
      vi.mocked(authApi.loginWithCredentials).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth());

      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password12345',
      };

      await act(async () => {
        await result.current.handleLogin(credentials);
      });

      expect(mockAuthState.setLoading).toHaveBeenCalledWith(true);
      expect(mockAuthState.clearError).toHaveBeenCalled();
      expect(authApi.loginWithCredentials).toHaveBeenCalledWith({
        email: credentials.email,
        password: credentials.password,
      });
      expect(mockAuthState.login).toHaveBeenCalledWith(mockCustomer, 'login-api-key');
      expect(mockAuthState.setLoading).toHaveBeenCalledWith(false);
    });

    it('should handle login errors', async () => {
      const mockError = new Error('Login failed');
      vi.mocked(authApi.loginWithCredentials).mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth());

      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password12345',
      };

      await act(async () => {
        await result.current.handleLogin(credentials);
      });

      expect(mockAuthState.setError).toHaveBeenCalledWith(expect.stringContaining('Authentication failed'));
    });
  });

  describe('Logout', () => {
    it('should handle logout successfully', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.handleLogout();
      });

      expect(mockAuthState.setLoading).toHaveBeenCalledWith(true);
      expect(authApi.logout).toHaveBeenCalled();
      expect(mockAuthState.logout).toHaveBeenCalled();
      expect(mockAuthState.setLoading).toHaveBeenCalledWith(false);
    });

    it('should handle logout errors gracefully', async () => {
      const mockError = new Error('Logout failed');
      vi.mocked(authApi.logout).mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.handleLogout();
      });

      // Should still clear local state even if API call fails
      expect(mockAuthState.logout).toHaveBeenCalled();
      expect(mockAuthState.setError).toHaveBeenCalledWith(expect.stringContaining('Logout failed'));
    });
  });

  describe('Error Handling', () => {
    it('should provide proper error types', async () => {
      const apiError = {
        response: {
          status: 401,
          data: {
            detail: 'Unauthorized',
          },
        },
      };
      vi.mocked(authApi.loginWithCredentials).mockRejectedValue(apiError);

      const { result } = renderHook(() => useAuth());

      const credentials: LoginCredentials = {
        tenantName: 'test-tenant',
        adminEmail: 'test@example.com',
      };

      await act(async () => {
        await result.current.handleLogin(credentials);
      });

      expect(mockAuthState.setError).toHaveBeenCalledWith(
        expect.stringContaining('Authentication failed:')
      );
    });
  });

  describe('State Updates', () => {
    it('should expose store actions correctly', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(typeof result.current.handleRegister).toBe('function');
      expect(typeof result.current.handleLogin).toBe('function');
      expect(typeof result.current.handleLogout).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });

    it('should pass through store state correctly', () => {
      const authenticatedState = {
        ...mockAuthState,
        user: {
          ...mockCustomer,
          lastLoginAt: '2024-01-01T00:00:00Z',
        },
        token: 'test-token',
        isAuthenticated: true,
        isInitialized: true,
      };
      vi.mocked(useAuthStore).mockReturnValue(authenticatedState);

      const { result } = renderHook(() => useAuth());
      
      expect(result.current.user).toEqual(authenticatedState.user);
      expect(result.current.token).toBe('test-token');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isInitialized).toBe(true);
    });
  });
});
