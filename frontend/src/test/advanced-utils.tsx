// Advanced testing utilities for dashboard and query system components
// Updated to match real backend API contracts

import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';

// Real backend API response mock data - matching actual endpoints
export const mockDashboardStats = {
  totalDatabases: 5,
  totalQueries: 142,
  totalStorageBytes: 27262976, // ~25.4GB in bytes
  avgQueryResponseTimeMs: 234,
  activeConnections: 3,
  lastUpdated: new Date().toISOString(),
  // Real backend may include additional metrics
  databasesTrend: 12.5,
  storageTrend: 8.3,
  queryTrend: -5.2,
  performanceTrend: 15.7,
};

// Match backend database entity structure
export const mockDatabase = {
  id: 'db-12345',
  name: 'test-database',
  description: 'Test database for unit tests',
  tenantId: 'tenant-123',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
  sizeBytes: 1048576,
  nodeCount: 150,
  edgeCount: 300,
  status: 'active' as const,
  // Backend-specific fields
  connectionStatus: 'connected' as const,
  lastBackup: '2024-01-14T20:00:00Z',
};

// Match real query execution response structure
export const mockQueryResult = {
  transactionId: 'txn-query-123',
  status: 'completed' as const,
  query: 'MATCH (n) RETURN n LIMIT 10',
  databaseId: 'db-12345',
  startedAt: '2024-01-15T10:30:00Z',
  completedAt: '2024-01-15T10:30:00.245Z',
  results: {
    rows: [
      { 'n.id': '1', 'n.name': 'Alice' },
      { 'n.id': '2', 'n.name': 'Bob' },
    ],
    totalCount: 10,
    executionTimeMs: 245,
    columns: ['n.id', 'n.name'],
  },
  // Backend metadata
  parameters: {},
  timeoutSeconds: 30,
};

// Enhanced render function with query client options
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClientOptions?: {
    defaultOptions?: any;
  };
  initialEntries?: string[];
  preloadedQueries?: Record<string, any>;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    queryClientOptions = {},
    initialEntries = ['/'],
    preloadedQueries = {},
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    ...queryClientOptions,
  });

  // Preload queries if provided
  Object.entries(preloadedQueries).forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey.split('.'), data);
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    );
  }

  return {
    user: userEvent.setup(),
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// API mocking utilities - matching real backend contracts
export const createMockApi = () => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  const mockPut = vi.fn();
  const mockDelete = vi.fn();

  return {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
    
    // Helper methods for real backend endpoint responses
    mockSuccessfulDashboardStats: () => {
      mockGet.mockResolvedValueOnce({ 
        data: mockDashboardStats,
        status: 200,
      });
    },
    
    mockSuccessfulDatabases: () => {
      mockGet.mockResolvedValueOnce({ 
        data: { databases: [mockDatabase] },
        status: 200,
      });
    },
    
    mockSuccessfulQuerySubmission: () => {
      mockPost.mockResolvedValueOnce({ 
        data: { 
          transactionId: 'txn-query-123',
          status: 'submitted',
          message: 'Query submitted for async execution'
        },
        status: 202, // Accepted for async processing
      });
    },
    
    mockSuccessfulQueryStatus: () => {
      mockGet.mockResolvedValueOnce({
        data: mockQueryResult,
        status: 200,
      });
    },

    mockCustomerRegistration: () => {
      mockPost.mockResolvedValueOnce({
        data: {
          customer_id: 'cust-12345',
          tenant_name: 'test-tenant',
          organization_name: 'Test Org',
          admin_email: 'admin@test.com',
          api_key: 'kb_test_key_12345',
          subscription_status: 'active',
          created_at: new Date().toISOString(),
        },
        status: 201,
      });
    },
    
    mockApiError: (status = 500, message = 'Internal Server Error', details = {}) => {
      const error = new Error(message) as any;
      error.response = { 
        status, 
        data: { 
          error: message,
          details,
          timestamp: new Date().toISOString(),
          path: '/api/v1/test',
        }
      };
      mockGet.mockRejectedValueOnce(error);
      mockPost.mockRejectedValueOnce(error);
    },

    mockAuthenticationError: () => {
      const error = new Error('Invalid API key') as any;
      error.response = {
        status: 401,
        data: {
          error: 'Authentication failed',
          details: 'Invalid or expired API key',
          timestamp: new Date().toISOString(),
        }
      };
      mockGet.mockRejectedValueOnce(error);
      mockPost.mockRejectedValueOnce(error);
    },
    
    reset: () => {
      mockGet.mockReset();
      mockPost.mockReset();
      mockPut.mockReset();
      mockDelete.mockReset();
    }
  };
};

// Test data factories
export const createTestDatabase = (overrides: Partial<typeof mockDatabase> = {}) => ({
  ...mockDatabase,
  ...overrides,
});

export const createTestQueryResult = (overrides: Partial<typeof mockQueryResult> = {}) => ({
  ...mockQueryResult,
  ...overrides,
});

export const createTestDashboardStats = (overrides: Partial<typeof mockDashboardStats> = {}) => ({
  ...mockDashboardStats,
  ...overrides,
});

// Wait utilities for async operations
export const waitForQueryToFinish = async (queryClient: QueryClient, queryKey: string[]) => {
  await vi.waitFor(() => {
    const query = queryClient.getQueryState(queryKey);
    expect(query?.status).not.toBe('pending');
  });
};

// Mock EventSource for SSE real-time features (replaces WebSocket mock)
export const createMockEventSource = () => {
  const mockEventSource = {
    url: '',
    readyState: 0, // EventSource.CONNECTING = 0
    onopen: null as ((event: Event) => void) | null,
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as ((event: Event) => void) | null,
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    
    // Helper methods to trigger events in tests
    triggerOpen: () => {
      mockEventSource.readyState = 1; // EventSource.OPEN = 1
      if (mockEventSource.onopen) {
        mockEventSource.onopen(new Event('open'));
      }
    },
    
    triggerMessage: (eventData: any) => {
      const event = new MessageEvent('message', {
        data: JSON.stringify(eventData),
        lastEventId: Date.now().toString(),
      });
      if (mockEventSource.onmessage) {
        mockEventSource.onmessage(event);
      }
    },
    
    triggerQueryComplete: (transactionId: string, results: any = {}) => {
      mockEventSource.triggerMessage({
        event_type: 'completed',
        transaction_id: transactionId,
        database_id: 'db-12345',
        rows_count: '10',
        execution_time_ms: '245',
        ...results,
      });
    },

    triggerQueryFailed: (transactionId: string, error = 'Query execution failed') => {
      mockEventSource.triggerMessage({
        event_type: 'failed',
        transaction_id: transactionId,
        database_id: 'db-12345',
        error,
      });
    },
    
    triggerError: () => {
      mockEventSource.readyState = 2; // EventSource.CLOSED = 2
      if (mockEventSource.onerror) {
        mockEventSource.onerror(new Event('error'));
      }
    },
  };

  // Mock the global EventSource constructor
  (global as any).EventSource = vi.fn((url: string) => {
    mockEventSource.url = url;
    // Simulate async connection
    setTimeout(() => mockEventSource.triggerOpen(), 0);
    return mockEventSource;
  });
  
  return mockEventSource;
};

// Performance testing utilities
export const measureComponentRenderTime = async (
  renderFn: () => void,
  iterations = 10
) => {
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    times.push(end - start);
  }
  
  return {
    average: times.reduce((sum, time) => sum + time, 0) / times.length,
    min: Math.min(...times),
    max: Math.max(...times),
    times,
  };
};

// Accessibility testing helpers
export const checkAccessibility = async (container: HTMLElement) => {
  // Check for basic accessibility attributes
  const issues: string[] = [];
  
  // Check for images without alt text
  const images = container.querySelectorAll('img');
  images.forEach(img => {
    if (!img.getAttribute('alt') && img.getAttribute('alt') !== '') {
      issues.push('Image found without alt attribute');
    }
  });
  
  // Check for buttons without accessible names
  const buttons = container.querySelectorAll('button');
  buttons.forEach(button => {
    const hasText = button.textContent?.trim();
    const hasAriaLabel = button.getAttribute('aria-label');
    const hasAriaLabelledby = button.getAttribute('aria-labelledby');
    
    if (!hasText && !hasAriaLabel && !hasAriaLabelledby) {
      issues.push('Button found without accessible name');
    }
  });
  
  // Check for form inputs without labels
  const inputs = container.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    const id = input.getAttribute('id');
    const hasLabel = id && container.querySelector(`label[for="${id}"]`);
    const hasAriaLabel = input.getAttribute('aria-label');
    const hasAriaLabelledby = input.getAttribute('aria-labelledby');
    
    if (!hasLabel && !hasAriaLabel && !hasAriaLabelledby) {
      issues.push('Form input found without associated label');
    }
  });
  
  return issues;
};

// Error boundary testing
export class TestErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return <div data-testid="error-boundary">Something went wrong</div>;
    }

    return this.props.children;
  }
}

// Mock local storage
export const createMockStorage = () => {
  const storage = new Map<string, string>();
  
  return {
    getItem: vi.fn((key: string) => storage.get(key) || null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
    key: vi.fn((index: number) => Array.from(storage.keys())[index] || null),
    get length() { return storage.size; },
  };
};

// Helper to create consistent API error responses
export const createAPIError = (
  message: string,
  statusCode = 400,
  errorCode = 'VALIDATION_ERROR'
) => {
  const error = new Error(message);
  (error as any).response = {
    status: statusCode,
    data: {
      error: {
        code: errorCode,
        message,
        details: message,
        timestamp: new Date().toISOString(),
      },
    },
  };
  return error;
};

// Helper for network errors (no response object)
export const createNetworkError = (message = 'Network Error') => {
  const error = new Error(message);
  (error as any).code = 'NETWORK_ERROR';
  return error;
};

// Helper for specific backend errors
export const createBackendErrors = {
  authenticationFailed: () => createAPIError(
    'Authentication failed. Please check your API key.',
    401,
    'AUTHENTICATION_ERROR'
  ),
  databaseNotFound: (id: string) => createAPIError(
    `Database not found: ${id}`,
    404,
    'DATABASE_NOT_FOUND'
  ),
  queryExecutionFailed: (reason: string) => createAPIError(
    `Query execution failed: ${reason}`,
    400,
    'QUERY_EXECUTION_ERROR'
  ),
  rateLimitExceeded: () => createAPIError(
    'Rate limit exceeded. Please wait before retrying.',
    429,
    'RATE_LIMIT_EXCEEDED'
  ),
  validationError: (field: string) => createAPIError(
    `Validation failed for field: ${field}`,
    400,
    'VALIDATION_ERROR'
  ),
};