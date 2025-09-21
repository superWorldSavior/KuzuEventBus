/**
 * Client-side API key validation utilities for enhanced authentication
 */

export interface ApiKeyValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate API key format on client side before sending to server
 */
export function validateApiKeyFormat(apiKey: string): ApiKeyValidationResult {
  if (!apiKey) {
    return {
      isValid: false,
      error: 'API key is required'
    };
  }

  if (typeof apiKey !== 'string') {
    return {
      isValid: false,
      error: 'API key must be a string'
    };
  }

  if (!apiKey.startsWith('kb_')) {
    return {
      isValid: false,
      error: 'API key must start with "kb_"'
    };
  }

  if (apiKey.length < 10) {
    return {
      isValid: false,
      error: 'API key is too short'
    };
  }

  if (apiKey.length > 100) {
    return {
      isValid: false,
      error: 'API key is too long'
    };
  }

  // Check for valid characters (alphanumeric + underscore + hyphen) - URL-safe
  if (!/^kb_[a-zA-Z0-9_-]+$/.test(apiKey)) {
    return {
      isValid: false,
      error: 'API key contains invalid characters'
    };
  }

  return { isValid: true };
}

/**
 * Mask API key for display purposes (security)
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 10) {
    return '***';
  }
  
  const prefix = apiKey.substring(0, 6); // Show "kb_xxx"
  const suffix = apiKey.substring(apiKey.length - 3); // Show last 3 chars
  const middle = '*'.repeat(Math.max(0, apiKey.length - 9));
  
  return prefix + middle + suffix;
}

/**
 * Check if stored credentials are potentially expired
 * (This is a client-side heuristic, server validation is authoritative)
 */
export function isCredentialsPotentiallyExpired(): boolean {
  const storedTimestamp = localStorage.getItem('kuzu_auth_timestamp');
  if (!storedTimestamp) {
    return true; // No timestamp = potentially expired
  }

  const stored = parseInt(storedTimestamp, 10);
  // Fail fast: invalid, NaN, negative or zero timestamps are considered expired
  if (!Number.isFinite(stored) || Number.isNaN(stored) || stored <= 0) {
    return true;
  }
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

  return (now - stored) > sevenDays;
}

/**
 * Update the authentication timestamp
 */
export function updateAuthTimestamp(): void {
  localStorage.setItem('kuzu_auth_timestamp', Date.now().toString());
}

/**
 * Clear authentication timestamp
 */
export function clearAuthTimestamp(): void {
  localStorage.removeItem('kuzu_auth_timestamp');
}