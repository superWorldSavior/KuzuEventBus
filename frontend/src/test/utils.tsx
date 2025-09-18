import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/notifications/ToastContainer';

// Create a custom render function that includes all providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          {children}
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Custom queries and utilities
export const mockApiResponse = <T,>(data: T, delay = 0): Promise<T> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

export const mockApiError = (message: string, status = 500) => {
  const error = new Error(message) as any;
  error.response = {
    status,
    data: { message },
  };
  return Promise.reject(error);
};

// Mock data generators
export const createMockDatabase = (overrides = {}) => ({
  database_id: 'test-db-1',
  name: 'Test Database',
  description: 'A test database',
  tenant_id: 'test-tenant',
  created_at: '2024-01-01T00:00:00Z',
  size_bytes: 1024 * 1024,
  table_count: 5,
  last_accessed: '2024-01-02T00:00:00Z',
  schema: {},
  ...overrides,
});

export const createMockQuery = (overrides = {}) => ({
  id: 'query-1',
  query: 'MATCH (n) RETURN n LIMIT 10',
  status: 'success' as const,
  executionTime: 150,
  createdAt: '2024-01-01T00:00:00Z',
  database: 'test-db-1',
  resultCount: 10,
  ...overrides,
});

export const createMockActivity = (overrides = {}) => ({
  id: 'activity-1',
  type: 'query_executed' as const,
  title: 'Query Executed',
  description: 'A test query was executed successfully',
  timestamp: '2024-01-01T00:00:00Z',
  user: 'test-user',
  metadata: {},
  ...overrides,
});

export const createMockDashboardStats = (overrides = {}) => ({
  totalDatabases: 3,
  totalStorageGB: 10.5,
  queriesToday: 42,
  avgQueryTimeMs: 250,
  activeConnections: 2,
  lastUpdated: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Test helpers for common scenarios
export const waitForLoadingToFinish = async () => {
  const { waitForElementToBeRemoved, queryByText } = await import('@testing-library/react');
  
  // Wait for common loading indicators to disappear
  const loadingElement = queryByText(/loading/i) || queryByText(/fetching/i);
  if (loadingElement) {
    await waitForElementToBeRemoved(loadingElement);
  }
};

export const expectElementToBeVisible = (element: HTMLElement | null) => {
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
};

export const expectElementToHaveAccessibleName = (element: HTMLElement | null, name: string) => {
  expect(element).toBeInTheDocument();
  expect(element).toHaveAccessibleName(name);
};

// Form testing utilities
export const fillForm = async (formData: Record<string, string>) => {
  const { userEvent } = await import('@testing-library/user-event');
  const user = userEvent.setup();

  for (const [field, value] of Object.entries(formData)) {
    const input = document.querySelector(`[name="${field}"]`) as HTMLInputElement;
    if (input) {
      await user.clear(input);
      await user.type(input, value);
    }
  }
};

export const submitForm = async (formElement?: HTMLFormElement) => {
  const { userEvent } = await import('@testing-library/user-event');
  const user = userEvent.setup();
  
  const form = formElement || document.querySelector('form');
  if (form) {
    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submitButton) {
      await user.click(submitButton);
    }
  }
};

// Performance testing utilities
export const measureRenderTime = async (renderFn: () => void): Promise<number> => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

// Storage testing utilities
export const clearStorage = () => {
  localStorage.clear();
  sessionStorage.clear();
};

export const mockLocalStorage = (data: Record<string, string>) => {
  clearStorage();
  Object.entries(data).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
};

// Network mocking utilities (for MSW integration)
export const setupMockApi = () => {
  // This would set up Mock Service Worker for API mocking
  // For now, just return a cleanup function
  return () => {
    // Cleanup mocks
  };
};

// Accessibility testing helpers
export const runAxeCheck = async (container: HTMLElement) => {
  // This would run axe-core accessibility tests
  // For now, just check basic accessibility attributes
  const buttons = container.querySelectorAll('button');
  buttons.forEach(button => {
    if (!button.hasAttribute('aria-label') && !button.textContent?.trim()) {
      console.warn('Button found without accessible name:', button);
    }
  });
};

// Component testing utilities
export const getByTestId = (testId: string, container?: HTMLElement) => {
  const element = (container || document).querySelector(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`Element with data-testid="${testId}" not found`);
  }
  return element as HTMLElement;
};

export const queryByTestId = (testId: string, container?: HTMLElement) => {
  return (container || document).querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
};