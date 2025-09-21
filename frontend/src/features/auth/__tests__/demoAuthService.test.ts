import { describe, it, expect, beforeEach, vi } from 'vitest';
import { demoAuthService } from '../services/demoAuthService';
import { authApi } from '../services/authApi';
import { getDefaultDemoUser } from '@/shared/lib/demo-users';

// Mock dependencies
vi.mock('../services/authApi');
vi.mock('@/shared/lib/demo-users');
vi.mock('@/shared/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('demoAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage before each test
    localStorage.clear();
    
    // Mock default demo user
    vi.mocked(getDefaultDemoUser).mockReturnValue({
      name: 'Demo Admin',
      email: 'demo@kuzu-eventbus.com',
      password: 'demo123',
      apiKey: 'kb_demo_1234567890abcdef1234567890abcdef',
      tenantName: 'demo-tenant',
      customerId: 'demo-customer-12345',
      role: 'admin',
      description: 'Default demo user with full access',
    });
  });

  describe('isDemoModeAvailable', () => {
    it('should return true when demo user has all required fields', () => {
      const isAvailable = demoAuthService.isDemoModeAvailable();
      expect(isAvailable).toBe(true);
    });

    it('should return false when demo user is missing required fields', () => {
      vi.mocked(getDefaultDemoUser).mockReturnValue({
        name: 'Demo Admin',
        email: 'demo@kuzu-eventbus.com',
        password: 'demo123',
        apiKey: '', // Missing API key
        tenantName: 'demo-tenant',
        customerId: 'demo-customer-12345',
        role: 'admin',
        description: 'Default demo user with full access',
      });

      const isAvailable = demoAuthService.isDemoModeAvailable();
      expect(isAvailable).toBe(false);
    });
  });

  describe('loginWithDemoAccount', () => {
    it('should successfully login with existing demo API key', async () => {
      const mockCustomer = {
        id: 'demo-customer-12345',
        tenantName: 'demo-tenant',
        organizationName: 'Demo Organization',
        adminEmail: 'demo@kuzu-eventbus.com',
        subscriptionStatus: 'active' as const,
        createdAt: '2023-01-01T00:00:00Z',
      };

      vi.mocked(authApi.loginWithApiKey).mockResolvedValue(mockCustomer);

      const result = await demoAuthService.loginWithDemoAccount();

      expect(authApi.loginWithApiKey).toHaveBeenCalledWith('kb_demo_1234567890abcdef1234567890abcdef');
      expect(result).toEqual(mockCustomer);
    });

    it('should create demo account when API key login fails', async () => {
      // Mock API key login failure
      vi.mocked(authApi.loginWithApiKey).mockRejectedValue(new Error('Invalid API key'));

      // Mock successful account creation
      const mockRegistrationResponse = {
        customer_id: 'new-demo-customer',
        tenant_name: 'demo-tenant-123456',
        organization_name: 'Demo Organization',
        admin_email: 'demo+123456@kuzu-eventbus.com',
        api_key: 'kb_new_demo_key',
        subscription_status: 'active',
        created_at: '2023-01-01T00:00:00Z',
      };

      vi.mocked(authApi.registerCustomer).mockResolvedValue(mockRegistrationResponse);

      const result = await demoAuthService.loginWithDemoAccount();

      expect(authApi.registerCustomer).toHaveBeenCalled();
      expect(result.id).toBe('new-demo-customer');
      expect(result.tenantName).toBe('demo-tenant-123456');
    });

    it('should use fallback demo credentials when all else fails', async () => {
      // Mock both API key login and registration failures
      vi.mocked(authApi.loginWithApiKey).mockRejectedValue(new Error('Invalid API key'));
      vi.mocked(authApi.registerCustomer).mockRejectedValue(new Error('Registration failed'));

      const result = await demoAuthService.loginWithDemoAccount();

      // Should return fallback customer
      expect(result.id).toBe('demo-customer-12345');
      expect(result.tenantName).toBe('demo-tenant');
      expect(result.organizationName).toBe('Demo Organization');

      // Should store credentials in localStorage
      expect(localStorage.getItem('kuzu_api_key')).toBe('kb_demo_1234567890abcdef1234567890abcdef');
      expect(localStorage.getItem('kuzu_customer_id')).toBe('demo-customer-12345');
      expect(localStorage.getItem('kuzu_tenant_name')).toBe('demo-tenant');
    });
  });

  describe('getDemoUserInfo', () => {
    it('should return demo user information', () => {
      const userInfo = demoAuthService.getDemoUserInfo();
      
      expect(userInfo.name).toBe('Demo Admin');
      expect(userInfo.email).toBe('demo@kuzu-eventbus.com');
      expect(userInfo.apiKey).toBe('kb_demo_1234567890abcdef1234567890abcdef');
      expect(userInfo.role).toBe('admin');
    });
  });

  describe('createDemoAccount', () => {
    it('should create a new demo account with unique tenant name', async () => {
      const mockResponse = {
        customer_id: 'new-demo-customer',
        tenant_name: 'demo-tenant-123456',
        organization_name: 'Demo Organization',
        admin_email: 'demo+123456@kuzu-eventbus.com',
        api_key: 'kb_new_demo_key',
        subscription_status: 'active',
        created_at: '2023-01-01T00:00:00Z',
      };

      vi.mocked(authApi.registerCustomer).mockResolvedValue(mockResponse);

      const result = await demoAuthService.createDemoAccount();

      expect(authApi.registerCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_name: expect.stringMatching(/^demo-tenant-\d+$/),
          organization_name: 'Demo Organization',
          admin_email: expect.stringMatching(/^demo\+\d+@kuzu-eventbus\.com$/),
        })
      );

      expect(result.customer.id).toBe('new-demo-customer');
      expect(result.apiKey).toBe('kb_new_demo_key');
    });

    it('should throw error when registration fails', async () => {
      vi.mocked(authApi.registerCustomer).mockRejectedValue(new Error('Registration failed'));

      await expect(demoAuthService.createDemoAccount()).rejects.toThrow('Failed to create demo account: Registration failed');
    });
  });
});