import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock @monaco-editor/react
vi.mock('@monaco-editor/react', () => ({
  default: () => null,
  Editor: () => null,
}));

// Global test setup
beforeAll(() => {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
  }));

  // Mock performance.now for timing tests
  Object.defineProperty(performance, 'now', {
    writable: true,
    value: vi.fn(() => Date.now()),
  });

  // Mock performance.mark and performance.measure
  Object.defineProperty(performance, 'mark', {
    writable: true,
    value: vi.fn(),
  });

  Object.defineProperty(performance, 'measure', {
    writable: true,
    value: vi.fn(),
  });

  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      length: Object.keys(store).length,
      key: (index: number) => Object.keys(store)[index] || null,
    };
  })();
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock,
  });

  // Suppress console errors during tests (unless explicitly needed)
  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: React.createFactory() is deprecated'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

// Custom matchers for better testing
expect.extend({
  toBeInTheDocument: (received: any) => {
    const element = received;
    const pass = element && document.body.contains(element);
    
    return {
      message: () =>
        pass
          ? `Expected element not to be in the document`
          : `Expected element to be in the document`,
      pass,
    };
  },
});