/**
 * Server-Sent Events (SSE) Client Service
 *
 * Provides a robust SSE client with:
 * - Automatic reconnection with exponential backoff
 * - Event type handlers
 * - Connection state management
 * - Heartbeat monitoring
 */

export type SSEEventType =
  | 'connected'
  | 'ticket_created'
  | 'ticket_updated'
  | 'ticket_status_changed'
  | 'ticket_assigned'
  | 'worklog_added'
  | 'notification'

export type SSEEventHandler = (data: any) => void

export interface SSEClientOptions {
  /** Maximum reconnection attempts (0 = unlimited) */
  maxReconnectAttempts?: number
  /** Initial reconnection delay in ms */
  initialReconnectDelay?: number
  /** Maximum reconnection delay in ms */
  maxReconnectDelay?: number
  /** Heartbeat timeout in ms (connection is considered dead if no message received) */
  heartbeatTimeout?: number
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed'

export interface SSEClientEvents {
  onStateChange?: (state: ConnectionState) => void
  onError?: (error: Error) => void
  onReconnect?: (attempt: number) => void
}

const DEFAULT_OPTIONS: Required<SSEClientOptions> = {
  maxReconnectAttempts: 0, // Unlimited
  initialReconnectDelay: 1000,
  maxReconnectDelay: 30000,
  heartbeatTimeout: 45000, // 45 seconds (server sends heartbeat every 30s)
}

export class SSEClient {
  private eventSource: EventSource | null = null
  private eventHandlers: Map<SSEEventType, Set<SSEEventHandler>> = new Map()
  private options: Required<SSEClientOptions>
  private events: SSEClientEvents
  private reconnectAttempts = 0
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null
  private url: string
  private token: string
  private _state: ConnectionState = 'disconnected'

  constructor(
    url: string,
    token: string,
    options: SSEClientOptions = {},
    events: SSEClientEvents = {}
  ) {
    this.url = url
    this.token = token
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.events = events
  }

  /**
   * Get current connection state
   */
  get state(): ConnectionState {
    return this._state
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this._state === 'connected'
  }

  /**
   * Connect to the SSE endpoint
   */
  connect(): void {
    if (this.eventSource) {
      this.disconnect()
    }

    this.setState('connecting')

    try {
      const fullUrl = `${this.url}?token=${encodeURIComponent(this.token)}`
      this.eventSource = new EventSource(fullUrl)

      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0
        this.setState('connected')
        this.startHeartbeatMonitor()
      }

      this.eventSource.onerror = (event) => {
        console.error('SSE connection error:', event)
        this.handleError(new Error('SSE connection error'))
      }

      // Set up event listeners for all registered event types
      this.setupEventListeners()
    } catch (error) {
      console.error('Failed to create EventSource:', error)
      this.handleError(error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * Disconnect from the SSE endpoint
   */
  disconnect(): void {
    this.clearReconnectTimeout()
    this.clearHeartbeatTimeout()

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    this.setState('disconnected')
  }

  /**
   * Update the authentication token
   */
  updateToken(token: string): void {
    this.token = token
    if (this.isConnected) {
      // Reconnect with new token
      this.disconnect()
      this.connect()
    }
  }

  /**
   * Register an event handler
   */
  on(eventType: SSEEventType, handler: SSEEventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set())
    }

    this.eventHandlers.get(eventType)!.add(handler)

    // If already connected, add listener to existing EventSource
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
      this.addEventSourceListener(eventType)
    }

    // Return unsubscribe function
    return () => {
      this.off(eventType, handler)
    }
  }

  /**
   * Remove an event handler
   */
  off(eventType: SSEEventType, handler: SSEEventHandler): void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * Remove all handlers for an event type
   */
  offAll(eventType: SSEEventType): void {
    this.eventHandlers.delete(eventType)
  }

  /**
   * Clear all event handlers
   */
  clearHandlers(): void {
    this.eventHandlers.clear()
  }

  private setState(state: ConnectionState): void {
    if (this._state !== state) {
      this._state = state
      this.events.onStateChange?.(state)
    }
  }

  private setupEventListeners(): void {
    if (!this.eventSource) return

    // Add listeners for all registered event types
    for (const eventType of this.eventHandlers.keys()) {
      this.addEventSourceListener(eventType)
    }

    // Always listen for 'message' event (default SSE event)
    this.eventSource.onmessage = (event) => {
      this.resetHeartbeatMonitor()
      // Default message handling if needed
    }
  }

  private addEventSourceListener(eventType: SSEEventType): void {
    if (!this.eventSource) return

    this.eventSource.addEventListener(eventType, (event: MessageEvent) => {
      this.resetHeartbeatMonitor()

      try {
        const data = JSON.parse(event.data)
        const handlers = this.eventHandlers.get(eventType)
        if (handlers) {
          handlers.forEach((handler) => {
            try {
              handler(data)
            } catch (error) {
              console.error(`Error in SSE handler for ${eventType}:`, error)
            }
          })
        }
      } catch (error) {
        console.error(`Failed to parse SSE event data for ${eventType}:`, error)
      }
    })
  }

  private handleError(error: Error): void {
    this.clearHeartbeatTimeout()
    this.events.onError?.(error)

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    this.attemptReconnect()
  }

  private attemptReconnect(): void {
    // Check if we've exceeded max attempts
    if (
      this.options.maxReconnectAttempts > 0 &&
      this.reconnectAttempts >= this.options.maxReconnectAttempts
    ) {
      this.setState('failed')
      return
    }

    this.setState('reconnecting')
    this.reconnectAttempts++
    this.events.onReconnect?.(this.reconnectAttempts)

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.options.initialReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.options.maxReconnectDelay
    )

    console.log(`SSE reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    this.reconnectTimeout = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  private startHeartbeatMonitor(): void {
    this.resetHeartbeatMonitor()
  }

  private resetHeartbeatMonitor(): void {
    this.clearHeartbeatTimeout()

    this.heartbeatTimeout = setTimeout(() => {
      console.warn('SSE heartbeat timeout - connection may be dead')
      this.handleError(new Error('Heartbeat timeout'))
    }, this.options.heartbeatTimeout)
  }

  private clearHeartbeatTimeout(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }
  }
}

/**
 * Create SSE clients for tickets and notifications
 */
export function createSSEClients(token: string, baseUrl: string = '/api/v1') {
  const ticketsClient = new SSEClient(
    `${baseUrl}/sse/tickets`,
    token,
    {
      maxReconnectAttempts: 0,
      initialReconnectDelay: 1000,
      maxReconnectDelay: 30000,
    }
  )

  const notificationsClient = new SSEClient(
    `${baseUrl}/sse/notifications`,
    token,
    {
      maxReconnectAttempts: 0,
      initialReconnectDelay: 1000,
      maxReconnectDelay: 30000,
    }
  )

  return {
    tickets: ticketsClient,
    notifications: notificationsClient,
  }
}
