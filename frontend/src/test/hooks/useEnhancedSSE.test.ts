import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEnhancedSSE } from '@/shared/hooks/useEnhancedSSE';

// Mock EventSource
class MockEventSource {
  public url: string;
  public readyState: number = EventSource.CONNECTING;
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => this.simulateOpen(), 100);
  }

  simulateOpen() {
    this.readyState = MockEventSource.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: any) {
    if (this.onmessage) {
      const event = new MessageEvent('message', { data: JSON.stringify(data) });
      this.onmessage(event);
    }
  }

  simulateError() {
    this.readyState = MockEventSource.CLOSED;
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }
}

// Mock auth hook
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

global.EventSource = MockEventSource as any;

describe('useEnhancedSSE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should establish connection when enabled', async () => {
    const { result } = renderHook(() => 
      useEnhancedSSE({
        url: 'http://localhost:8000/events/stream',
        enabled: true,
      })
    );

    expect(result.current.isConnecting).toBe(true);
    expect(result.current.isConnected).toBe(false);

    // Advance timers to trigger connection
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isConnecting).toBe(false);
  });

  it('should not connect when disabled', () => {
    const { result } = renderHook(() => 
      useEnhancedSSE({
        url: 'http://localhost:8000/events/stream',
        enabled: false,
      })
    );

    expect(result.current.isConnecting).toBe(false);
    expect(result.current.isConnected).toBe(false);
  });

  it('should handle reconnection with exponential backoff', async () => {
    const mockOnReconnect = vi.fn();
    
    const { result } = renderHook(() => 
      useEnhancedSSE({
        url: 'http://localhost:8000/events/stream',
        enabled: true,
        onReconnect: mockOnReconnect,
        reconnectInterval: 1000,
        backoffMultiplier: 2,
      })
    );

    // Simulate connection and error
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Simulate error to trigger reconnection
    act(() => {
      const eventSource = (global as any).EventSource;
      if (eventSource.prototype.simulateError) {
        eventSource.prototype.simulateError();
      }
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.reconnectCount).toBeGreaterThan(0);
  });

  it('should stop reconnecting after max attempts', async () => {
    const mockOnMaxRetriesReached = vi.fn();
    
    const { result } = renderHook(() => 
      useEnhancedSSE({
        url: 'http://localhost:8000/events/stream',
        enabled: true,
        maxReconnectAttempts: 2,
        onMaxRetriesReached: mockOnMaxRetriesReached,
      })
    );

    // Simulate multiple connection failures
    for (let i = 0; i < 3; i++) {
      act(() => {
        vi.advanceTimersByTime(150);
      });

      act(() => {
        const eventSource = (global as any).EventSource;
        if (eventSource.prototype.simulateError) {
          eventSource.prototype.simulateError();
        }
      });

      act(() => {
        vi.advanceTimersByTime(2000); // Wait for reconnection attempt
      });
    }

    expect(result.current.hasReachedMaxRetries).toBe(true);
    expect(mockOnMaxRetriesReached).toHaveBeenCalled();
  });

  it('should calculate exponential backoff correctly', () => {
    const { result } = renderHook(() => 
      useEnhancedSSE({
        url: 'http://localhost:8000/events/stream',
        enabled: false, // Don't actually connect
        reconnectInterval: 1000,
        backoffMultiplier: 2,
        maxBackoffInterval: 30000,
      })
    );

    // Test backoff calculation
    const delay = result.current.nextReconnectDelay;
    expect(delay).toBeGreaterThan(0);
    expect(delay).toBeLessThanOrEqual(30000);
  });

  it('should handle manual reconnect', async () => {
    const { result } = renderHook(() => 
      useEnhancedSSE({
        url: 'http://localhost:8000/events/stream',
        enabled: true,
        maxReconnectAttempts: 1,
      })
    );

    // Simulate max retries reached
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Trigger error multiple times to reach max retries
    act(() => {
      const eventSource = (global as any).EventSource;
      if (eventSource.prototype.simulateError) {
        eventSource.prototype.simulateError();
      }
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.hasReachedMaxRetries).toBe(true);

    // Manual reconnect should reset state
    act(() => {
      result.current.reconnect();
    });

    expect(result.current.hasReachedMaxRetries).toBe(false);
    expect(result.current.reconnectCount).toBe(0);
  });

  it('should process messages correctly', async () => {
    const mockOnMessage = vi.fn();
    
    renderHook(() => 
      useEnhancedSSE({
        url: 'http://localhost:8000/events/stream',
        enabled: true,
        onMessage: mockOnMessage,
      })
    );

    // Wait for connection
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Simulate message
    act(() => {
      const eventSource = (global as any).EventSource;
      if (eventSource.prototype.simulateMessage) {
        eventSource.prototype.simulateMessage({ type: 'test', data: 'hello' });
      }
    });

    expect(mockOnMessage).toHaveBeenCalled();
  });
});