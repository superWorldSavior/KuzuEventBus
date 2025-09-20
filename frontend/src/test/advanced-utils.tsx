// Advanced testing utilities for dashboard and query system components

import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';

// Mock data generators
export const mockDashboardStats = {
  totalDatabases: 5,
  totalStorageGB: 25.4,
  queriesToday: 142,
  avgQueryTimeMs: 234,
  activeConnections: 3,
  lastUpdated: new Date().toISOString(),
  trends: {
    databasesGrowth: 12.5,
    storageGrowth: 8.3,
    queryGrowth: -5.2,
    performanceChange: 15.7,
  },
};

export const mockDatabase = {
  database_id: 'db-12345',
  name: 'test-database',
  description: 'Test database for unit tests',
  tenant_id: 'tenant-123',
  created_at: '2024-01-01T00:00:00Z',
  size_bytes: 1048576,
  table_count: 3,
  last_accessed: '2024-01-15T10:30:00Z',
};

export const mockQueryResult = {
  id: 'query-123',
  query: 'MATCH (n) RETURN n LIMIT 10',
  status: 'success' as const,
  executionTime: 245,
  createdAt: '2024-01-15T10:30:00Z',
  database: 'test-database',
  resultCount: 10,
  data: [
    { 'n.id': '1', 'n.name': 'Alice' },
    { 'n.id': '2', 'n.name': 'Bob' },
  ],
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

// API mocking utilities
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
    
    // Helper methods for common scenarios
    mockSuccessfulDashboardStats: () => {
      mockGet.mockResolvedValueOnce({ data: mockDashboardStats });
    },
    
    mockSuccessfulDatabases: () => {
      mockGet.mockResolvedValueOnce({ 
        data: { databases: [mockDatabase] } 
      });
    },
    
    mockSuccessfulQuery: () => {
      mockPost.mockResolvedValueOnce({ data: mockQueryResult });
    },
    
    mockApiError: (status = 500, message = 'Server Error') => {
      const error = new Error(message) as any;
      error.response = { status, data: { message } };
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

// Mock WebSocket for real-time features
export const createMockWebSocket = () => {
  const mockWebSocket = {
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: WebSocket.OPEN,
    
    // Helper to trigger events
    triggerMessage: (data: any) => {
      const event = new MessageEvent('message', {
        data: JSON.stringify(data)
      });
      const messageHandler = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      if (messageHandler) messageHandler(event);
    },
    
    triggerClose: () => {
      const closeHandler = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'close')?.[1];
      if (closeHandler) closeHandler(new CloseEvent('close'));
    },
  };

  // Mock the global WebSocket constructor
  (global as any).WebSocket = vi.fn(() => mockWebSocket);
  
  return mockWebSocket;
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