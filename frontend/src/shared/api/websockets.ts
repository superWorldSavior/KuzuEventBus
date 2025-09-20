import { useAuth } from '@/features/auth/hooks/useAuth';

export interface WebSocketMessage<T = any> {
  type: string;
  id?: string;
  timestamp: number;
  payload: T;
}

export interface WebSocketOptions {
  url: string;
  protocols?: string | string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private protocols?: string | string[];
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private heartbeatInterval: number;
  private reconnectCount = 0;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private heartbeatIntervalId: NodeJS.Timeout | null = null;
  private messageHandlers = new Map<string, Set<(payload: any) => void>>();
  private isManuallyDisconnected = false;

  public options: WebSocketOptions;

  constructor(options: WebSocketOptions) {
    this.options = options;
    this.url = options.url;
    this.protocols = options.protocols;
    this.reconnectInterval = options.reconnectInterval ?? 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    this.heartbeatInterval = options.heartbeatInterval ?? 30000;
  }

  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isManuallyDisconnected = false;
        
        // Build WebSocket URL with auth token
        const wsUrl = new URL(this.url, window.location.origin);
        wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        
        if (token) {
          wsUrl.searchParams.set('token', token);
        }

        this.ws = new WebSocket(wsUrl.toString(), this.protocols);

        this.ws.onopen = (event) => {
          console.log('WebSocket connected:', this.url);
          this.reconnectCount = 0;
          this.startHeartbeat();
          this.options.onOpen?.(event);
          resolve();
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.stopHeartbeat();
          this.options.onClose?.(event);

          // Attempt reconnection if not manually disconnected
          if (!this.isManuallyDisconnected && this.shouldReconnect(event.code)) {
            this.scheduleReconnect(token);
          }
        };

        this.ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          this.options.onError?.(event);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.warn('Failed to parse WebSocket message:', event.data);
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.isManuallyDisconnected = true;
    this.stopHeartbeat();
    
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
  }

  send<T>(type: string, payload: T, id?: string): boolean {
    if (!this.isConnected()) {
      console.warn('Cannot send message: WebSocket not connected');
      return false;
    }

    const message: WebSocketMessage<T> = {
      type,
      id,
      timestamp: Date.now(),
      payload,
    };

    try {
      this.ws!.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }

  subscribe<T>(messageType: string, handler: (payload: T) => void): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    
    this.messageHandlers.get(messageType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(messageType);
        }
      }
    };
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  isConnecting(): boolean {
    return this.ws?.readyState === WebSocket.CONNECTING;
  }

  getReadyState(): number | null {
    return this.ws?.readyState ?? null;
  }

  private handleMessage(message: WebSocketMessage): void {
    this.options.onMessage?.(message);

    // Handle heartbeat/ping messages
    if (message.type === 'ping') {
      this.send('pong', { timestamp: message.timestamp });
      return;
    }

    // Notify subscribed handlers
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.payload);
        } catch (error) {
          console.error(`Error in message handler for type ${message.type}:`, error);
        }
      });
    }
  }

  private shouldReconnect(closeCode: number): boolean {
    // Don't reconnect for certain close codes
    const dontReconnectCodes = [
      1000, // Normal closure
      1001, // Going away
      1005, // No status received
      4000, // Custom: Authentication failed
      4001, // Custom: Forbidden
    ];

    return !dontReconnectCodes.includes(closeCode);
  }

  private scheduleReconnect(token?: string): void {
    if (this.reconnectCount >= this.maxReconnectAttempts) {
      console.error('Max WebSocket reconnection attempts reached');
      return;
    }

    this.reconnectCount++;
    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectCount - 1), 30000);

    console.log(`Scheduling WebSocket reconnection (${this.reconnectCount}/${this.maxReconnectAttempts}) in ${delay}ms`);

    this.reconnectTimeoutId = setTimeout(() => {
      this.connect(token).catch(error => {
        console.error('WebSocket reconnection failed:', error);
      });
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatIntervalId = setInterval(() => {
      if (this.isConnected()) {
        this.send('ping', { timestamp: Date.now() });
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }
}

// Singleton WebSocket service instances
let dashboardWS: WebSocketService | null = null;
let queryWS: WebSocketService | null = null;

export function getDashboardWebSocket(): WebSocketService {
  if (!dashboardWS) {
    dashboardWS = new WebSocketService({
      url: '/api/v1/dashboard/ws',
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
    });
  }
  return dashboardWS;
}

export function getQueryWebSocket(): WebSocketService {
  if (!queryWS) {
    queryWS = new WebSocketService({
      url: '/api/v1/queries/ws',
      reconnectInterval: 2000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 15000,
    });
  }
  return queryWS;
}

// React hook for WebSocket connection
export function useWebSocket(
  getWebSocketService: () => WebSocketService,
  autoConnect = true
) {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const wsRef = React.useRef<WebSocketService | null>(null);

  React.useEffect(() => {
    if (!autoConnect || !token) return;

    const ws = getWebSocketService();
    wsRef.current = ws;

    setIsConnecting(true);
    setError(null);

    const originalOnOpen = ws.options.onOpen;
    const originalOnClose = ws.options.onClose;
    const originalOnError = ws.options.onError;

    ws.options.onOpen = (event) => {
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
      originalOnOpen?.(event);
    };

    ws.options.onClose = (event) => {
      setIsConnected(false);
      setIsConnecting(false);
      originalOnClose?.(event);
    };

    ws.options.onError = (event) => {
      setError(new Error('WebSocket connection error'));
      setIsConnecting(false);
      originalOnError?.(event);
    };

    ws.connect(token).catch(error => {
      setError(error);
      setIsConnecting(false);
    });

    return () => {
      ws.disconnect();
    };
  }, [token, autoConnect, getWebSocketService]);

  const send = React.useCallback(<T,>(type: string, payload: T, id?: string) => {
    return wsRef.current?.send(type, payload, id) ?? false;
  }, []);

  const subscribe = React.useCallback(<T,>(messageType: string, handler: (payload: T) => void) => {
    return wsRef.current?.subscribe(messageType, handler) ?? (() => {});
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    send,
    subscribe,
  };
}

// Fix React import for build
import React from 'react';