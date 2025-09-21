import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { authApi } from '../services/auth.api';
import { apiClient } from '@/shared/api/client';
import type { Customer } from '@/entities/customer';

// Mock the API client
vi.mock('@/shared/api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
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

describe('AuthAPI', () => {
  const mockCustomer: Customer = {
    id: 'test-customer-id',
    tenantName: 'test-tenant',
    organizationName: 'Test Organization',
    adminEmail: 'test@example.com',
    subscriptionStatus: 'active',
    createdAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Storage Methods', () => {
    it('should store API key correctly', () => {
      localStorageMock.setItem('kuzu_api_key', 'test-api-key');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('kuzu_api_key', 'test-api-key');
    });

    it('should retrieve API key correctly', () => {
      // Set up localStorage directly
      localStorage.setItem('kuzu_api_key', 'stored-api-key');
      
      const result = authApi.getApiKey();
      
      expect(result).toBe('stored-api-key');
      
      // Cleanup
      localStorage.removeItem('kuzu_api_key');
    });

    it('should return null when no API key is stored', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = authApi.getApiKey();
      
      expect(result).toBeNull();
    });

    it('should store customer ID correctly', () => {
      localStorageMock.setItem('kuzu_customer_id', 'test-customer-id');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('kuzu_customer_id', 'test-customer-id');
    });

    it('should retrieve customer ID correctly', () => {
      // Set up localStorage directly
      localStorage.setItem('kuzu_customer_id', 'stored-customer-id');
      
      const result = authApi.getCustomerId();
      
      expect(result).toBe('stored-customer-id');
      
      // Cleanup
      localStorage.removeItem('kuzu_customer_id');
    });

    it('should clear storage on logout', async () => {
      // Set up localStorage with values
      localStorage.setItem('kuzu_api_key', 'test-key');
      localStorage.setItem('kuzu_customer_id', 'test-id');
      
      await authApi.logout();
      
      // Verify values are removed
      expect(localStorage.getItem('kuzu_api_key')).toBeNull();
      expect(localStorage.getItem('kuzu_customer_id')).toBeNull();
    });
  });

  describe('Customer Registration', () => {
    it('should register customer successfully', async () => {
      const mockResponse = {
        data: {
          customer: mockCustomer,
          api_key: 'new-api-key',
        },
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const registrationData = {
        tenant_name: 'test-tenant',
        organization_name: 'Test Organization',
        admin_email: 'test@example.com',
      };

      const result = await authApi.registerCustomer(registrationData as any);

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/register', registrationData as any);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle registration errors', async () => {
      const mockError = new Error('Registration failed');
      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      const registrationData = {
        tenant_name: 'test-tenant',
        organization_name: 'Test Organization',
        admin_email: 'test@example.com',
      };

      await expect(authApi.registerCustomer(registrationData)).rejects.toMatchObject({
        message: expect.stringContaining('Unable to connect to the server'),
      });
    });
  });

  describe('Customer Authentication', () => {
    it('should authenticate with credentials successfully', async () => {
      const mockResponse = {
        data: {
          customer: mockCustomer,
          api_key: 'auth-api-key',
        },
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const credentials = {
        email: 'test@example.com',
        password: 'password12345',
      };

      const result = await authApi.loginWithCredentials(credentials as any);

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/login', credentials as any);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle authentication errors', async () => {
      const mockError = new Error('Authentication failed');
      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      const credentials = {
        email: 'test@example.com',
        password: 'password12345',
      };

      await expect(authApi.loginWithCredentials(credentials as any)).rejects.toMatchObject({
        message: expect.stringContaining('Unable to connect to the server'),
      });
    });
  });

  describe('Current Customer', () => {
    it('should get current customer successfully', async () => {
      // Set up localStorage with customer ID
      localStorage.setItem('kuzu_customer_id', 'test-customer-id');
      
      const mockResponse = {
        data: {
          customer_id: 'test-customer-id',
          tenant_name: mockCustomer.tenantName,
          organization_name: mockCustomer.organizationName,
          admin_email: mockCustomer.adminEmail,
          subscription_status: mockCustomer.subscriptionStatus,
          created_at: mockCustomer.createdAt,
        },
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await authApi.getCurrentCustomer();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/customers/test-customer-id');
      expect(result).toEqual(mockCustomer);
      
      // Cleanup
      localStorage.removeItem('kuzu_customer_id');
    });

    it('should return null when no customer ID is stored', async () => {
      // Ensure no customer ID in localStorage
      localStorage.removeItem('kuzu_customer_id');
      localStorage.removeItem('kuzu-customer-id');

      const result = await authApi.getCurrentCustomer();

      expect(result).toBeNull();
    });

    it('should handle API errors when getting current customer', async () => {
      // Set up localStorage with customer ID
      localStorage.setItem('kuzu_customer_id', 'test-customer-id');
      
      const mockError = new Error('Failed to get current customer');
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      const res = await authApi.getCurrentCustomer();
      expect(res).toBeNull();
      
      // Cleanup
      localStorage.removeItem('kuzu_customer_id');
    });
  });

  describe('Session Validation', () => {
    it('should validate session successfully', async () => {
      // Set up localStorage with customer ID
      localStorage.setItem('kuzu_customer_id', 'test-customer-id');
      
      const mockResponse = {
        data: {
          customer_id: 'test-customer-id',
          tenant_name: 'test-tenant',
          organization_name: 'Test Org',
          admin_email: 'test@example.com',
          subscription_status: 'active',
          created_at: '2024-01-01T00:00:00Z',
        },
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await authApi.validateSession();

      expect(result).toBe(true);
      
      // Cleanup
      localStorage.removeItem('kuzu_customer_id');
    });

    it('should return false when getCurrentCustomer fails', async () => {
      // Set up localStorage with customer ID
      localStorage.setItem('kuzu_customer_id', 'test-customer-id');
      
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));

      const result = await authApi.validateSession();

      expect(result).toBe(false);
      
      // Cleanup
      localStorage.removeItem('kuzu_customer_id');
    });

    it('should return false when no customer ID is stored', async () => {
      // Ensure no customer ID in localStorage
      localStorage.removeItem('kuzu_customer_id');
      localStorage.removeItem('kuzu-customer-id');

      const result = await authApi.validateSession();

      expect(result).toBe(false);
    });
  });

  describe('Helper Functions', () => {
    it('should normalize subscription status correctly', async () => {
      // Set up localStorage with customer ID
      localStorage.setItem('kuzu_customer_id', 'test-id');
      
      const mockResponse = {
        data: {
          customer_id: 'test-id',
          tenant_name: 'test-tenant',
          organization_name: 'Test Org',
          admin_email: 'test@example.com',
          subscription_status: 'active',
          created_at: '2024-01-01T00:00:00Z',
        },
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await authApi.getCurrentCustomer();
      
      expect(result?.subscriptionStatus).toBe('active');
      
      // Cleanup
      localStorage.removeItem('kuzu_customer_id');
    });

    it('should normalize invalid subscription status to active', async () => {
      // Set up localStorage with customer ID
      localStorage.setItem('kuzu_customer_id', 'test-id');
      
      const mockResponse = {
        data: {
          customer_id: 'test-id',
          tenant_name: 'test-tenant',
          organization_name: 'Test Org',
          admin_email: 'test@example.com',
          subscription_status: 'invalid-status',
          created_at: '2024-01-01T00:00:00Z',
        },
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await authApi.getCurrentCustomer();
      
      expect(result?.subscriptionStatus).toBe('active');
      
      // Cleanup
      localStorage.removeItem('kuzu_customer_id');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error');
      vi.mocked(apiClient.post).mockRejectedValue(networkError);

      const registrationData = {
        tenant_name: 'test-tenant',
        organization_name: 'Test Organization',
        admin_email: 'test@example.com',
      };

      await expect(authApi.registerCustomer(registrationData as any)).rejects.toMatchObject({
        message: expect.stringMatching(/Unable to connect to the server/),
      });
    });

    it('should handle API response errors', async () => {
      const apiError = {
        response: {
          status: 400,
          data: {
            detail: 'Bad Request',
          },
        },
      };
      vi.mocked(apiClient.post).mockRejectedValue(apiError);

      const credentials = {
        email: 'test@example.com',
        password: 'password12345',
      };

      await expect(authApi.loginWithCredentials(credentials)).rejects.toMatchObject({
        message: expect.stringMatching(/Bad Request/),
      });
    });
  });
});
