/**
 * Test setup file for Auth module
 * Configures common mocks and utilities for all auth tests
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Global test configuration
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
  
  // Reset localStorage mock
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Reset console methods to avoid spam in tests
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  // Restore all mocks after each test
  vi.restoreAllMocks();
});

// Global test utilities
export const mockCustomer = {
  id: 'test-customer-id',
  tenantName: 'test-tenant',
  organizationName: 'Test Organization',
  adminEmail: 'test@example.com',
  subscriptionStatus: 'active' as const,
  createdAt: '2024-01-01T00:00:00Z',
};

export const mockApiKey = 'kb_test_api_key_123456789';

export const createMockApiResponse = (data: any) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
});

export const createMockApiError = (status: number, message: string) => ({
  response: {
    status,
    data: {
      detail: message,
    },
    statusText: status === 400 ? 'Bad Request' : status === 401 ? 'Unauthorized' : 'Error',
  },
  message,
  name: 'AxiosError',
});

// Custom matchers for auth-specific assertions
expect.extend({
  toBeValidApiKey(received: string) {
    const isValid = typeof received === 'string' && 
                   received.startsWith('kb_') && 
                   received.length >= 10 && 
                   received.length <= 100 &&
                   /^kb_[a-zA-Z0-9_-]+$/.test(received);
    
    return {
      message: () => 
        `expected ${received} to ${isValid ? 'not ' : ''}be a valid API key format`,
      pass: isValid,
    };
  },

  toBeAuthenticatedUser(received: any) {
    const hasRequiredFields = received && 
                             typeof received.id === 'string' &&
                             typeof received.tenantName === 'string' &&
                             typeof received.organizationName === 'string' &&
                             typeof received.adminEmail === 'string' &&
                             typeof received.subscriptionStatus === 'string' &&
                             typeof received.createdAt === 'string';
    
    return {
      message: () => 
        `expected ${received} to ${hasRequiredFields ? 'not ' : ''}be a valid authenticated user object`,
      pass: hasRequiredFields,
    };
  },
});

// Extend vitest's expect interface
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeValidApiKey(): T;
    toBeAuthenticatedUser(): T;
  }
  interface AsymmetricMatchersContaining {
    toBeValidApiKey(): any;
    toBeAuthenticatedUser(): any;
  }
}
