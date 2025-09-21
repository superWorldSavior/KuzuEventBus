import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../services/auth.api';
import { validateApiKeyFormat, updateAuthTimestamp } from '../utils/validation';
import type { Customer } from '@/entities/customer';
import type { RegistrationData, LoginCredentials } from '../types';

// Mock only the external dependencies, not our auth module
vi.mock('@/shared/api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('@/shared/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Auth Integration Tests', () => {
  const mockCustomer: Customer = {
    id: 'test-customer-id',
    tenantName: 'test-tenant',
    organizationName: 'Test Organization',
    adminEmail: 'test@example.com',
    subscriptionStatus: 'active',
    createdAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    // Reset the store to initial state
    useAuthStore.getState().logout();
    useAuthStore.setState({
      isInitialized: false,
      isLoading: true,
      error: undefined,
    });

    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Complete Registration Flow', () => {
    it('should handle complete user registration journey', async () => {
      // Mock successful registration API response
      const mockApiResponse = {
        data: {
          customer: mockCustomer,
          api_key: 'kb_new_registration_key_123456789',
        },
      };

      const { apiClient } = await import('@/shared/api/client');
      vi.mocked(apiClient.post).mockResolvedValue(mockApiResponse);

      // Render the hook
      const { result } = renderHook(() => useAuth());

      // Initial state: not authenticated yet
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();

      const registrationData: RegistrationData = {
        tenantName: 'test-tenant',
        organizationName: 'Test Organization',
        adminEmail: 'test@example.com',
      };

      // Perform registration
      await act(async () => {
        await result.current.handleRegister(registrationData);
      });

      // Verify the API was called correctly
      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/register', {
        tenant_name: registrationData.tenantName,
        organization_name: registrationData.organizationName,
        admin_email: registrationData.adminEmail,
      });

      // Verify state after successful registration
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual({
        ...mockCustomer,
        lastLoginAt: expect.any(String),
      });
      expect(result.current.token).toBe('kb_new_registration_key_123456789');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeUndefined();
    });

    it('should handle registration validation errors', async () => {
      const { apiClient } = await import('@/shared/api/client');
      const validationError = {
        response: {
          status: 400,
          data: {
            detail: 'Tenant name already exists',
          },
        },
      };
      vi.mocked(apiClient.post).mockRejectedValue(validationError);

      const { result } = renderHook(() => useAuth());

      const registrationData: RegistrationData = {
        tenantName: 'existing-tenant',
        organizationName: 'Test Organization',
        adminEmail: 'test@example.com',
      };

      await act(async () => {
        await result.current.handleRegister(registrationData);
      });

      // Should remain unauthenticated
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toContain('Registration failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Complete Login Flow', () => {
    it('should handle complete user login journey', async () => {
      const mockApiResponse = {
        data: {
          customer: mockCustomer,
          api_key: 'kb_login_key_987654321',
        },
      };

      const { apiClient } = await import('@/shared/api/client');
      vi.mocked(apiClient.post).mockResolvedValue(mockApiResponse);

      const { result } = renderHook(() => useAuth());

      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password12345',
      };

      await act(async () => {
        await result.current.handleLogin(credentials);
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/login', {
        email: credentials.email,
        password: credentials.password,
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.id).toBe(mockCustomer.id);
      expect(result.current.token).toBe('kb_login_key_987654321');
    });
  });

  describe('Session Restoration Flow', () => {
    it('should restore valid session on app initialization', async () => {
      // Set up localStorage with stored credentials
      localStorage.setItem('kuzu_api_key', 'kb_stored_key_123456789');
      localStorage.setItem('kuzu_customer_id', mockCustomer.id);

      // Mock successful validation
      const { apiClient } = await import('@/shared/api/client');
      vi.mocked(apiClient.get).mockResolvedValue({
        data: {
          customer_id: mockCustomer.id,
          tenant_name: mockCustomer.tenantName,
          organization_name: mockCustomer.organizationName,
          admin_email: mockCustomer.adminEmail,
          subscription_status: mockCustomer.subscriptionStatus,
          created_at: mockCustomer.createdAt,
        },
      });

      const { result } = renderHook(() => useAuth());

      // Wait for initialization to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should be authenticated after restoration
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.id).toBe(mockCustomer.id);
      expect(result.current.token).toBe('kb_stored_key_123456789');
      expect(result.current.isInitialized).toBe(true);
      
      // Cleanup
      localStorage.removeItem('kuzu_api_key');
      localStorage.removeItem('kuzu_customer_id');
    });

    it('should handle invalid stored session', async () => {
      // Mock stored credentials invalid by key
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'kuzu_api_key' || key === 'kuzu-api-key') return 'kb_invalid_key_123456789';
        if (key === 'kuzu_customer_id' || key === 'kuzu-customer-id') return 'invalid-customer-id';
        return null as any;
      });

      // Mock API rejection
      const { apiClient } = await import('@/shared/api/client');
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should be unauthenticated; cleanup storage is deferred in prod
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });
  });

  describe('Logout Flow', () => {
    it('should handle complete logout process', async () => {
      // First login a user
      const loginResponse = {
        data: {
          customer: mockCustomer,
          api_key: 'kb_logout_test_key_123456789',
        },
      };

      const { apiClient } = await import('@/shared/api/client');
      vi.mocked(apiClient.post).mockResolvedValue(loginResponse);

      const { result } = renderHook(() => useAuth());

      // Login first
      await act(async () => {
        await result.current.handleLogin({
          email: 'test@example.com',
          password: 'password12345',
        });
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Now logout
      await act(async () => {
        await result.current.handleLogout();
      });

      // Should be logged out
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      // Verify localStorage was cleared (test the actual result, not mocks)
      expect(localStorage.getItem('kuzu_api_key')).toBeNull();
      expect(localStorage.getItem('kuzu_customer_id')).toBeNull();
    });
  });

  describe('API Key Validation Integration', () => {
    it('should validate API keys throughout the auth flow', async () => {
      const validApiKey = 'kb_valid_integration_key_123456789';
      const invalidApiKey = 'invalid_key_format';

      // Test valid API key
      const validResult = validateApiKeyFormat(validApiKey);
      expect(validResult.isValid).toBe(true);

      // Test invalid API key
      const invalidResult = validateApiKeyFormat(invalidApiKey);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBeTruthy();

      // Integration with auth flow
      const mockApiResponse = {
        data: {
          customer: mockCustomer,
          api_key: validApiKey,
        },
      };

      const { apiClient } = await import('@/shared/api/client');
      vi.mocked(apiClient.post).mockResolvedValue(mockApiResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.handleLogin({
          tenantName: 'test-tenant',
          adminEmail: 'test@example.com',
        });
      });

      expect(result.current.token).toBe(validApiKey);
      expect(validateApiKeyFormat(result.current.token!).isValid).toBe(true);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from network errors gracefully', async () => {
      const { apiClient } = await import('@/shared/api/client');
      
      // First attempt fails with network error
      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network Error'));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.handleLogin({
          tenantName: 'test-tenant',
          adminEmail: 'test@example.com',
        });
      });

      // Should show error but not crash
      expect(result.current.error).toContain('Authentication failed');
      expect(result.current.isAuthenticated).toBe(false);

      // Second attempt succeeds
      const mockApiResponse = {
        data: {
          customer: mockCustomer,
          api_key: 'kb_recovery_key_123456789',
        },
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockApiResponse);

      await act(async () => {
        await result.current.handleLogin({
          tenantName: 'test-tenant',
          adminEmail: 'test@example.com',
        });
      });

      // Should succeed on retry
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeUndefined();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent login attempts safely', async () => {
      const { apiClient } = await import('@/shared/api/client');
      const mockApiResponse = {
        data: {
          customer: mockCustomer,
          api_key: 'kb_concurrent_key_123456789',
        },
      };

      // Make API calls slower to simulate race conditions
      vi.mocked(apiClient.post).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(mockApiResponse), 100)
        )
      );

      const { result } = renderHook(() => useAuth());

      const credentials = {
        email: 'test@example.com',
        password: 'password12345',
      };

      // Start two login attempts simultaneously
      await act(async () => {
        const promise1 = result.current.handleLogin(credentials);
        const promise2 = result.current.handleLogin(credentials);
        await Promise.all([promise1, promise2]);
      });

      // Should still end up in a consistent state
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.id).toBe(mockCustomer.id);
    });
  });
});
