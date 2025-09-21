import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  validateApiKeyFormat,
  maskApiKey,
  isCredentialsPotentiallyExpired,
  updateAuthTimestamp,
  clearAuthTimestamp,
} from '../utils/validation';

// Mock localStorage globally with proper jest-like behavior
interface LocalStorageMock {
  store: Record<string, string>;
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
}

const localStorageMock: LocalStorageMock = {
  store: {},
  getItem: vi.fn().mockImplementation((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn().mockImplementation((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn().mockImplementation((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn().mockImplementation(() => {
    localStorageMock.store = {};
  }),
};

// Mock at the global level for the validation functions
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Auth Validation Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.store = {};
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('validateApiKeyFormat', () => {
    it('should validate correct API key format', () => {
      const validApiKey = 'kb_abcd1234efgh5678ijkl';
      const result = validateApiKeyFormat(validApiKey);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty API key', () => {
      const result = validateApiKeyFormat('');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API key is required');
    });

    it('should reject null or undefined API key', () => {
      const resultNull = validateApiKeyFormat(null as any);
      const resultUndefined = validateApiKeyFormat(undefined as any);
      
      expect(resultNull.isValid).toBe(false);
      expect(resultNull.error).toBe('API key is required');
      expect(resultUndefined.isValid).toBe(false);
      expect(resultUndefined.error).toBe('API key is required');
    });

    it('should reject non-string API key', () => {
      const result = validateApiKeyFormat(12345 as any);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API key must be a string');
    });

    it('should reject API key without kb_ prefix', () => {
      const result = validateApiKeyFormat('invalid_prefix_12345');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API key must start with "kb_"');
    });

    it('should reject API key that is too short', () => {
      const result = validateApiKeyFormat('kb_123'); // Only 6 chars total
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API key is too short');
    });

    it('should reject API key that is too long', () => {
      const longKey = 'kb_' + 'a'.repeat(98); // 101 chars total
      const result = validateApiKeyFormat(longKey);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API key is too long');
    });

    it('should reject API key with invalid characters', () => {
      const invalidChars = ['kb_test@key', 'kb_test key', 'kb_test.key', 'kb_test+key'];
      
      invalidChars.forEach(key => {
        const result = validateApiKeyFormat(key);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('API key contains invalid characters');
      });
    });

    it('should accept API key with valid characters', () => {
      const validKeys = [
        'kb_test1234',
        'kb_test-key-123',
        'kb_test_key_456',
        'kb_Test-Key_789',
        'kb_1234567890',
      ];
      
      validKeys.forEach(key => {
        const result = validateApiKeyFormat(key);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should handle edge case lengths correctly', () => {
      const minValidKey = 'kb_1234567'; // 10 chars - minimum valid
      const maxValidKey = 'kb_' + 'a'.repeat(97); // 100 chars - maximum valid
      
      expect(validateApiKeyFormat(minValidKey).isValid).toBe(true);
      expect(validateApiKeyFormat(maxValidKey).isValid).toBe(true);
    });
  });

  describe('maskApiKey', () => {
    it('should mask a valid API key correctly', () => {
      const apiKey = 'kb_abcd1234efgh5678ijkl';
      const masked = maskApiKey(apiKey);
      
      expect(masked).toBe('kb_abc**************jkl');
      expect(masked.length).toBe(apiKey.length);
      expect(masked.startsWith('kb_abc')).toBe(true);
      expect(masked.endsWith('jkl')).toBe(true);
    });

    it('should handle short API keys', () => {
      const shortKey = 'kb_123';
      const masked = maskApiKey(shortKey);
      
      expect(masked).toBe('***');
    });

    it('should handle empty or null keys', () => {
      expect(maskApiKey('')).toBe('***');
      expect(maskApiKey(null as any)).toBe('***');
      expect(maskApiKey(undefined as any)).toBe('***');
    });

    it('should handle minimum length keys correctly', () => {
      const minKey = 'kb_1234567'; // 10 chars
      const masked = maskApiKey(minKey);
      
      expect(masked).toBe('kb_123*567');
      expect(masked.length).toBe(minKey.length);
    });

    it('should handle very long keys', () => {
      const longKey = 'kb_' + 'a'.repeat(50) + 'xyz';
      const masked = maskApiKey(longKey);
      
      expect(masked.startsWith('kb_aaa')).toBe(true);
      expect(masked.endsWith('xyz')).toBe(true);
      expect(masked.length).toBe(longKey.length);
    });
  });

  describe('Authentication Timestamp Management', () => {
    beforeEach(() => {
      // Mock Date.now()
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('updateAuthTimestamp', () => {
      it('should set current timestamp in localStorage', () => {
        updateAuthTimestamp();
        const value = localStorage.getItem('kuzu_auth_timestamp');
        expect(typeof value).toBe('string');
        expect(value).toMatch(/^\d+$/);
      });
    });

    describe('clearAuthTimestamp', () => {
      it('should remove timestamp from localStorage', () => {
        localStorage.setItem('kuzu_auth_timestamp', '1');
        clearAuthTimestamp();
        
        expect(localStorage.getItem('kuzu_auth_timestamp')).toBeNull();
      });
    });

    describe('isCredentialsPotentiallyExpired', () => {
      it('should return true when no timestamp is stored', () => {
        localStorage.removeItem('kuzu_auth_timestamp');
        
        const result = isCredentialsPotentiallyExpired();
        
        expect(result).toBe(true);
      });

      it('should return true when credentials are older than 7 days', () => {
        const eightDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000);
        localStorage.setItem('kuzu_auth_timestamp', eightDaysAgo.toString());
        
        const result = isCredentialsPotentiallyExpired();
        
        expect(result).toBe(true);
      });

      it('should return false when credentials are within 7 days', () => {
        const sixDaysAgo = Date.now() - (6 * 24 * 60 * 60 * 1000);
        localStorage.setItem('kuzu_auth_timestamp', sixDaysAgo.toString());
        
        const result = isCredentialsPotentiallyExpired();
        
        expect(result).toBe(false);
      });

      it('should return false for fresh credentials', () => {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        localStorage.setItem('kuzu_auth_timestamp', oneHourAgo.toString());
        
        const result = isCredentialsPotentiallyExpired();
        
        expect(result).toBe(false);
      });

      it('should handle exactly 7 days correctly', () => {
        const exactlySevenDays = Date.now() - (7 * 24 * 60 * 60 * 1000);
        localStorage.setItem('kuzu_auth_timestamp', exactlySevenDays.toString());
        
        const result = isCredentialsPotentiallyExpired();
        
        expect(result).toBe(false);
      });

      it('should handle exactly 7 days correctly', () => {
        const exactlySevenDays = Date.now() - (7 * 24 * 60 * 60 * 1000);
        localStorageMock.getItem.mockReturnValue(exactlySevenDays.toString());
        
        const result = isCredentialsPotentiallyExpired();
        
        expect(result).toBe(false); // Exactly 7 days should still be valid
      });

      it('should handle invalid timestamp gracefully', () => {
        // Set invalid timestamp directly in localStorage
        localStorage.setItem('kuzu_auth_timestamp', 'invalid-timestamp');
        
        const result = isCredentialsPotentiallyExpired();
        
        expect(result).toBe(true); // Invalid timestamp should be considered expired
        
        // Cleanup
        localStorage.removeItem('kuzu_auth_timestamp');
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete validation flow', () => {
      const apiKey = 'kb_valid_key_123456';
      
      // Validate format
      const validation = validateApiKeyFormat(apiKey);
      expect(validation.isValid).toBe(true);
      
      // Mask for display
      const masked = maskApiKey(apiKey);
      expect(masked).toBe('kb_val**********456');
      
      // Update timestamp
      updateAuthTimestamp();
      const stored = localStorage.getItem('kuzu_auth_timestamp');
      expect(stored).not.toBeNull();
      
      // Check expiration
      localStorage.setItem('kuzu_auth_timestamp', Date.now().toString());
      const isExpired = isCredentialsPotentiallyExpired();
      expect(isExpired).toBe(false);
    });

    it('should handle invalid API key gracefully', () => {
      const invalidKey = 'invalid-key-format';
      
      const validation = validateApiKeyFormat(invalidKey);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBeTruthy();
      
      // Should still mask invalid keys for security - long keys get masked normally
      const masked = maskApiKey(invalidKey);
      expect(masked).toBe('invali*********mat'); // Long enough to be masked normally
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme timestamps', () => {
      // Far future timestamp
      const futureTimestamp = Date.now() + (365 * 24 * 60 * 60 * 1000);
      localStorage.setItem('kuzu_auth_timestamp', futureTimestamp.toString());
      
      const result = isCredentialsPotentiallyExpired();
      expect(result).toBe(false); // Future timestamp means not expired
    });

    it('should handle zero timestamp', () => {
      localStorage.setItem('kuzu_auth_timestamp', '0');
      
      const result = isCredentialsPotentiallyExpired();
      expect(result).toBe(true); // Very old timestamp should be expired
    });

    it('should handle negative timestamp', () => {
      localStorage.setItem('kuzu_auth_timestamp', '-1000');
      
      const result = isCredentialsPotentiallyExpired();
      expect(result).toBe(true); // Negative timestamp should be considered expired
    });
  });
});
