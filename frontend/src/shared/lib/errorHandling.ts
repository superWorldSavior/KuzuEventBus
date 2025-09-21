// Enhanced error handling for API services
// Provides better user feedback and standardized error management

export interface ApiErrorDetails {
  type: 'network' | 'backend' | 'validation' | 'auth' | 'server' | 'not_implemented';
  message: string;
  userMessage: string;
  endpoint: string;
  status?: number;
  timestamp: string;
  canRetry: boolean;
  hasMockData: boolean;
}

export interface BackendEndpointStatus {
  endpoint: string;
  status: 'working' | 'not_implemented' | 'unknown' | 'error';
  lastChecked: string;
  errorDetails?: string;
}

// Track endpoint statuses globally
const endpointStatusMap = new Map<string, BackendEndpointStatus>();

// User-friendly error messages
const ERROR_MESSAGES = {
  network: {
    default: "Unable to connect to the server. Please check your internet connection and try again.",
    timeout: "The request timed out. Please try again.",
  },
  auth: {
    unauthorized: "Your session has expired. Please log in again.",
    forbidden: "You don't have permission to access this resource.",
    invalid_key: "Invalid API key. Please check your credentials.",
  },
  server: {
    internal: "The server encountered an error. Please try again later.",
    maintenance: "The service is temporarily unavailable for maintenance.",
  },
  backend: {
    not_implemented: "This feature is coming soon! Currently showing simulated data for development.",
    partial: "Some features are still in development. Basic functionality is available.",
  },
  validation: {
    required: "Please fill in all required fields.",
    invalid: "Please check your input and try again.",
  },
};

// Determine error type and details from axios error
export function analyzeError(error: any, endpoint: string): ApiErrorDetails {
  const timestamp = new Date().toISOString();
  
  // Network errors (no response)
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return {
        type: 'network',
        message: 'Request timeout',
        userMessage: ERROR_MESSAGES.network.timeout,
        endpoint,
        timestamp,
        canRetry: true,
        hasMockData: false,
      };
    }
    
    return {
      type: 'network',
      message: error.message || 'Network error',
      userMessage: ERROR_MESSAGES.network.default,
      endpoint,
      timestamp,
      canRetry: true,
      hasMockData: false,
    };
  }

  const status = error.response.status;
  const data = error.response.data;

  // Authentication errors
  if (status === 401) {
    return {
      type: 'auth',
      message: 'Unauthorized',
      userMessage: ERROR_MESSAGES.auth.unauthorized,
      endpoint,
      status,
      timestamp,
      canRetry: false,
      hasMockData: false,
    };
  }

  if (status === 403) {
    return {
      type: 'auth',
      message: 'Forbidden',
      userMessage: ERROR_MESSAGES.auth.forbidden,
      endpoint,
      status,
      timestamp,
      canRetry: false,
      hasMockData: false,
    };
  }

  // Validation errors
  if (status === 400) {
    return {
      type: 'validation',
      message: data?.detail || 'Bad request',
      userMessage: data?.detail || ERROR_MESSAGES.validation.invalid,
      endpoint,
      status,
      timestamp,
      canRetry: false,
      hasMockData: false,
    };
  }

  // Not implemented (backend returns 501)
  if (status === 501) {
    return {
      type: 'not_implemented',
      message: 'Not implemented',
      userMessage: ERROR_MESSAGES.backend.not_implemented,
      endpoint,
      status,
      timestamp,
      canRetry: false,
      hasMockData: true,
    };
  }

  // Server errors
  if (status >= 500) {
    return {
      type: 'server',
      message: data?.detail || 'Server error',
      userMessage: ERROR_MESSAGES.server.internal,
      endpoint,
      status,
      timestamp,
      canRetry: true,
      hasMockData: false,
    };
  }

  // Default case
  return {
    type: 'backend',
    message: data?.detail || error.message || 'Unknown error',
    userMessage: `An error occurred (${status}). Please try again.`,
    endpoint,
    status,
    timestamp,
    canRetry: true,
    hasMockData: false,
  };
}

// Enhanced error handler with better feedback
export function handleApiError(endpoint: string, error: any, mockData?: any): any {
  const errorDetails = analyzeError(error, endpoint);
  
  // Update endpoint status tracking
  endpointStatusMap.set(endpoint, {
    endpoint,
    status: errorDetails.type === 'not_implemented' ? 'not_implemented' : 'error',
    lastChecked: errorDetails.timestamp,
    errorDetails: errorDetails.message,
  });

  // Console logging with better formatting
  const logPrefix = getLogPrefix(errorDetails.type);
  console.group(`${logPrefix} ${endpoint}`);
  console.warn('Error Details:', {
    type: errorDetails.type,
    status: errorDetails.status,
    message: errorDetails.message,
    canRetry: errorDetails.canRetry,
    hasMockData: errorDetails.hasMockData,
  });
  
  if (errorDetails.type === 'not_implemented' && mockData) {
    console.info('📝 Using mock data for development - this endpoint is planned but not yet implemented');
  } else if (errorDetails.type === 'network' && mockData) {
    console.info('🔌 Backend unavailable - falling back to mock data for development');
  }
  
  console.groupEnd();

  // Handle authentication errors immediately
  if (errorDetails.type === 'auth' && errorDetails.status === 401) {
    // Clear stored credentials
    localStorage.removeItem('kuzu_api_key');
    localStorage.removeItem('kuzu_customer_id');
    localStorage.removeItem('kuzu_tenant_name');
    localStorage.removeItem('auth_token');
    
    // Redirect to login (avoid infinite loops)
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
      window.location.href = '/login';
    }
  }

  // Return mock data if available and appropriate
  if (mockData && (errorDetails.type === 'not_implemented' || errorDetails.type === 'network')) {
    return mockData;
  }

  // Create enhanced error object with user-friendly information
  const enhancedError = new Error(errorDetails.userMessage) as any;
  enhancedError.details = errorDetails;
  enhancedError.originalError = error;
  
  throw enhancedError;
}

// Get appropriate log prefix for console output
function getLogPrefix(errorType: ApiErrorDetails['type']): string {
  switch (errorType) {
    case 'not_implemented':
      return '🚧';
    case 'network':
      return '🔌';
    case 'auth':
      return '🔐';
    case 'server':
      return '💥';
    case 'validation':
      return '⚠️';
    default:
      return '❌';
  }
}

// Export function to get backend integration status
export function getBackendIntegrationStatus(): BackendEndpointStatus[] {
  return Array.from(endpointStatusMap.values());
}

// Update endpoint status on successful requests
export function markEndpointWorking(endpoint: string): void {
  endpointStatusMap.set(endpoint, {
    endpoint,
    status: 'working',
    lastChecked: new Date().toISOString(),
  });
}

// Utility to check if an endpoint is known to be not implemented
export function isEndpointNotImplemented(endpoint: string): boolean {
  const status = endpointStatusMap.get(endpoint);
  return status?.status === 'not_implemented';
}

// Utility to get user-friendly error message
export function getUserFriendlyError(error: any): string {
  if (error?.details?.userMessage) {
    return error.details.userMessage;
  }
  
  if (typeof error?.message === 'string') {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

// Create notification-friendly error info
export interface ErrorNotification {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

export function createErrorNotification(error: any): ErrorNotification {
  const details = error?.details as ApiErrorDetails;
  
  if (!details) {
    return {
      title: 'Error',
      message: getUserFriendlyError(error),
      type: 'error',
    };
  }

  switch (details.type) {
    case 'not_implemented':
      return {
        title: 'Feature In Development',
        message: details.userMessage,
        type: 'info',
        duration: 5000,
      };
    
    case 'network':
      return {
        title: 'Connection Issue',
        message: details.userMessage,
        type: 'warning',
        actions: details.canRetry ? [{
          label: 'Retry',
          action: () => window.location.reload(),
        }] : undefined,
      };
    
    case 'auth':
      return {
        title: 'Authentication Required',
        message: details.userMessage,
        type: 'error',
        actions: [{
          label: 'Login',
          action: () => window.location.href = '/login',
        }],
      };
    
    case 'server':
      return {
        title: 'Server Error',
        message: details.userMessage,
        type: 'error',
        actions: details.canRetry ? [{
          label: 'Retry',
          action: () => window.location.reload(),
        }] : undefined,
      };
    
    default:
      return {
        title: 'Error',
        message: details.userMessage,
        type: 'error',
      };
  }
}