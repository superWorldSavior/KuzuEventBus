/**
 * SSE Connection Manager
 * 
 * Manages the EventSource connection to the backend SSE endpoint.
 * Dispatches events to the global window event bus for consumption by hooks.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface SSEConnectionConfig {
  apiKey: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  debug?: boolean;
}

class SSEConnectionManager {
  private eventSource: EventSource | null = null;
  private config: SSEConnectionConfig | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1s, exponential backoff

  /**
   * Connect to the SSE endpoint
   */
  connect(config: SSEConnectionConfig) {
    if (this.eventSource) {
      this.log('Already connected, disconnecting first');
      this.disconnect();
    }

    this.config = config;
    const url = `${API_BASE_URL}/api/v1/events/stream`;

    this.log('Connecting to SSE:', url);

    try {
      // Note: EventSource doesn't support custom headers in standard browsers
      // The API key should be sent via query param or cookie
      // For now, we'll use query param (backend needs to support this)
      const urlWithAuth = `${url}?api_key=${encodeURIComponent(config.apiKey)}`;
      
      this.eventSource = new EventSource(urlWithAuth);

      this.eventSource.onopen = () => {
        this.log('✅ SSE Connected');
        this.reconnectAttempts = 0;
        config.onConnect?.();
      };

      this.eventSource.onerror = (error) => {
        this.log('❌ SSE Error:', error);
        config.onError?.(error);

        // Attempt reconnection with exponential backoff
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
          this.reconnectAttempts++;
          this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          
          setTimeout(() => {
            if (this.config) {
              this.connect(this.config);
            }
          }, delay);
        } else {
          this.log('Max reconnection attempts reached');
          this.disconnect();
        }
      };

      // Generic message handler (for events without explicit type)
      this.eventSource.onmessage = (event) => {
        this.handleSSEMessage(event);
      };

      // Register handlers for all known event types
      // The backend sends events with explicit event types via SSE
      const eventTypes = [
        // Databases
        'database_created',
        'database_deleted',
        'file_uploaded',
        // Snapshots & PITR
        'snapshot_created',
        'database_restored',
        // Branches
        'branch_created',
        'branch_merged',
        'branch_deleted',
        // Queries
        'completed',
        'timeout',
        'failed',
        'query_cancelled',
        // Accounts
        'welcome',
        'api_key_created',
        'subscription_updated',
      ];

      eventTypes.forEach((eventType) => {
        this.eventSource!.addEventListener(eventType, (event) => {
          this.handleSSEMessage(event as MessageEvent, eventType);
        });
      });

    } catch (error) {
      this.log('Failed to create EventSource:', error);
      config.onError?.(error as Event);
    }
  }

  /**
   * Disconnect from SSE
   */
  disconnect() {
    if (this.eventSource) {
      this.log('Disconnecting SSE');
      this.eventSource.close();
      this.eventSource = null;
      this.config?.onDisconnect?.();
      this.config = null;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }

  /**
   * Handle incoming SSE message
   */
  private handleSSEMessage(event: MessageEvent, explicitType?: string) {
    try {
      const data = JSON.parse(event.data);
      
      // Use explicit type if provided, otherwise get from data
      const eventType = explicitType || data.event_type;
      
      this.log('📨 SSE Event received:', eventType, data);

      // Dispatch to global event bus for hooks to consume
      const customEvent = new CustomEvent('sse:event', {
        detail: {
          ...data,
          event_type: eventType,
        },
      });

      window.dispatchEvent(customEvent);
    } catch (error) {
      this.log('Failed to parse SSE message:', error, event.data);
    }
  }

  /**
   * Debug logging
   */
  private log(...args: any[]) {
    if (this.config?.debug) {
      console.log('[SSE Manager]', ...args);
    }
  }
}

// Singleton instance
export const sseManager = new SSEConnectionManager();

/**
 * React hook to manage SSE connection lifecycle
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { apiKey } = useAuth();
 *   useSSEConnection(apiKey);
 *   return <YourApp />;
 * }
 * ```
 */
export function useSSEConnection(apiKey: string | null, options?: { debug?: boolean }) {
  const { useEffect } = require('react');

  useEffect(() => {
    if (!apiKey) return;

    sseManager.connect({
      apiKey,
      debug: options?.debug || false,
      onConnect: () => {
        console.log('✅ SSE Connected');
      },
      onDisconnect: () => {
        console.log('🔌 SSE Disconnected');
      },
      onError: (error) => {
        console.error('❌ SSE Error:', error);
      },
    });

    return () => {
      sseManager.disconnect();
    };
  }, [apiKey, options?.debug]);
}
