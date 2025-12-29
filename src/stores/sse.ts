/**
 * SSE Store - Pinia store for managing Server-Sent Events connections
 *
 * Provides:
 * - Centralized SSE connection management
 * - Reactive connection state
 * - Event history storage
 * - Composable for use in components
 */

import { defineStore } from 'pinia'
import { ref, computed, watch, onUnmounted } from 'vue'
import { SSEClient, type SSEEventType, type ConnectionState } from '@/services/sse'
import { useAuthStore } from '@/stores/auth'
import type { Ticket } from '@/types'

// Event payload types
export interface TicketCreatedEvent {
  ticket: Ticket
  timestamp: string
}

export interface TicketUpdatedEvent {
  ticket: Ticket
  updated_fields: Record<string, any>
  timestamp: string
}

export interface TicketStatusChangedEvent {
  ticket: Ticket
  old_status: string
  new_status: string
  reason?: string
  timestamp: string
}

export interface TicketAssignedEvent {
  assignment: {
    id: string
    ticket_id: string
    assignee_type: string
    assignee_user_id?: string
    assignee_vendor_name?: string
  }
  ticket: Ticket
  timestamp: string
}

export interface WorklogAddedEvent {
  worklog: {
    id: string
    ticket_id: string
    body: string
    work_type: string
    time_spent_minutes?: number
    is_internal: boolean
    author_id: string
    created_at: string
  }
  ticket: {
    id: string
    ticket_number: string
    title: string
  }
  timestamp: string
}

export interface NotificationEvent {
  type: string
  title: string
  message: string
  data?: Record<string, any>
  timestamp: string
}

export interface SSEEvent {
  id: string
  type: SSEEventType
  data: any
  receivedAt: Date
}

const MAX_STORED_EVENTS = 100
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const useSSEStore = defineStore('sse', () => {
  // State
  const ticketsClient = ref<SSEClient | null>(null)
  const notificationsClient = ref<SSEClient | null>(null)
  const ticketsConnectionState = ref<ConnectionState>('disconnected')
  const notificationsConnectionState = ref<ConnectionState>('disconnected')
  const recentEvents = ref<SSEEvent[]>([])
  const unreadNotificationCount = ref(0)

  // Computed
  const isTicketsConnected = computed(() => ticketsConnectionState.value === 'connected')
  const isNotificationsConnected = computed(() => notificationsConnectionState.value === 'connected')
  const isConnected = computed(() => isTicketsConnected.value || isNotificationsConnected.value)

  // Event handlers storage for cleanup
  const eventCallbacks: Map<string, Set<(data: any) => void>> = new Map()

  // Initialize SSE connections
  function initialize() {
    const authStore = useAuthStore()

    if (!authStore.token) {
      console.warn('SSE: No auth token available, skipping initialization')
      return
    }

    // Create tickets client
    ticketsClient.value = new SSEClient(
      `${API_BASE_URL}/sse/tickets`,
      authStore.token,
      {
        maxReconnectAttempts: 0,
        initialReconnectDelay: 1000,
        maxReconnectDelay: 30000,
      },
      {
        onStateChange: (state) => {
          ticketsConnectionState.value = state
          console.log('SSE Tickets connection state:', state)
        },
        onError: (error) => {
          console.error('SSE Tickets error:', error)
        },
        onReconnect: (attempt) => {
          console.log(`SSE Tickets reconnecting (attempt ${attempt})`)
        },
      }
    )

    // Create notifications client
    notificationsClient.value = new SSEClient(
      `${API_BASE_URL}/sse/notifications`,
      authStore.token,
      {
        maxReconnectAttempts: 0,
        initialReconnectDelay: 1000,
        maxReconnectDelay: 30000,
      },
      {
        onStateChange: (state) => {
          notificationsConnectionState.value = state
          console.log('SSE Notifications connection state:', state)
        },
        onError: (error) => {
          console.error('SSE Notifications error:', error)
        },
        onReconnect: (attempt) => {
          console.log(`SSE Notifications reconnecting (attempt ${attempt})`)
        },
      }
    )

    // Set up internal event handlers for storing events
    setupInternalHandlers()

    // Connect both clients
    ticketsClient.value.connect()
    notificationsClient.value.connect()
  }

  function setupInternalHandlers() {
    if (!ticketsClient.value || !notificationsClient.value) return

    // Store all ticket events
    const ticketEventTypes: SSEEventType[] = [
      'ticket_created',
      'ticket_updated',
      'ticket_status_changed',
      'ticket_assigned',
      'worklog_added',
    ]

    ticketEventTypes.forEach((eventType) => {
      ticketsClient.value!.on(eventType, (data) => {
        addEvent(eventType, data)
      })
    })

    // Store notification events and update counter
    notificationsClient.value.on('notification', (data) => {
      addEvent('notification', data)
      unreadNotificationCount.value++
    })
  }

  function addEvent(type: SSEEventType, data: any) {
    const event: SSEEvent = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      receivedAt: new Date(),
    }

    recentEvents.value.unshift(event)

    // Limit stored events
    if (recentEvents.value.length > MAX_STORED_EVENTS) {
      recentEvents.value = recentEvents.value.slice(0, MAX_STORED_EVENTS)
    }

    // Dispatch to registered callbacks
    const callbacks = eventCallbacks.get(type)
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data)
        } catch (error) {
          console.error(`Error in SSE callback for ${type}:`, error)
        }
      })
    }
  }

  // Subscribe to events (for components)
  function subscribe(eventType: SSEEventType, callback: (data: any) => void): () => void {
    if (!eventCallbacks.has(eventType)) {
      eventCallbacks.set(eventType, new Set())
    }
    eventCallbacks.get(eventType)!.add(callback)

    // Return unsubscribe function
    return () => {
      eventCallbacks.get(eventType)?.delete(callback)
    }
  }

  // Subscribe to ticket created events
  function onTicketCreated(callback: (event: TicketCreatedEvent) => void): () => void {
    return subscribe('ticket_created', callback)
  }

  // Subscribe to ticket updated events
  function onTicketUpdated(callback: (event: TicketUpdatedEvent) => void): () => void {
    return subscribe('ticket_updated', callback)
  }

  // Subscribe to ticket status changed events
  function onTicketStatusChanged(callback: (event: TicketStatusChangedEvent) => void): () => void {
    return subscribe('ticket_status_changed', callback)
  }

  // Subscribe to ticket assigned events
  function onTicketAssigned(callback: (event: TicketAssignedEvent) => void): () => void {
    return subscribe('ticket_assigned', callback)
  }

  // Subscribe to worklog added events
  function onWorklogAdded(callback: (event: WorklogAddedEvent) => void): () => void {
    return subscribe('worklog_added', callback)
  }

  // Subscribe to notification events
  function onNotification(callback: (event: NotificationEvent) => void): () => void {
    return subscribe('notification', callback)
  }

  // Mark notifications as read
  function markNotificationsRead() {
    unreadNotificationCount.value = 0
  }

  // Clear event history
  function clearEvents() {
    recentEvents.value = []
  }

  // Disconnect all SSE connections
  function disconnect() {
    ticketsClient.value?.disconnect()
    notificationsClient.value?.disconnect()
    ticketsClient.value = null
    notificationsClient.value = null
    eventCallbacks.clear()
  }

  // Reconnect with new token
  function reconnect() {
    disconnect()
    initialize()
  }

  // Get events by type
  function getEventsByType(type: SSEEventType): SSEEvent[] {
    return recentEvents.value.filter((e) => e.type === type)
  }

  // Get events for a specific ticket
  function getEventsForTicket(ticketId: string): SSEEvent[] {
    return recentEvents.value.filter((e) => {
      const data = e.data
      return (
        data?.ticket?.id === ticketId ||
        data?.ticket_id === ticketId ||
        data?.worklog?.ticket_id === ticketId
      )
    })
  }

  return {
    // State
    ticketsConnectionState,
    notificationsConnectionState,
    recentEvents,
    unreadNotificationCount,

    // Computed
    isTicketsConnected,
    isNotificationsConnected,
    isConnected,

    // Actions
    initialize,
    disconnect,
    reconnect,
    subscribe,
    onTicketCreated,
    onTicketUpdated,
    onTicketStatusChanged,
    onTicketAssigned,
    onWorklogAdded,
    onNotification,
    markNotificationsRead,
    clearEvents,
    getEventsByType,
    getEventsForTicket,
  }
})

/**
 * Composable for using SSE in components
 *
 * Usage:
 * ```typescript
 * const { isConnected, onTicketCreated } = useSSE()
 *
 * onTicketCreated((event) => {
 *   console.log('New ticket:', event.ticket)
 * })
 * ```
 */
export function useSSE() {
  const store = useSSEStore()
  const authStore = useAuthStore()
  const unsubscribers: (() => void)[] = []

  // Initialize if not already connected and user is authenticated
  if (!store.isConnected && authStore.isAuthenticated) {
    store.initialize()
  }

  // Watch for auth changes
  const stopWatching = watch(
    () => authStore.isAuthenticated,
    (isAuthenticated) => {
      if (isAuthenticated && !store.isConnected) {
        store.initialize()
      } else if (!isAuthenticated && store.isConnected) {
        store.disconnect()
      }
    }
  )

  // Auto-cleanup on unmount
  onUnmounted(() => {
    stopWatching()
    unsubscribers.forEach((unsub) => unsub())
  })

  // Wrapped subscription functions that track unsubscribers
  function onTicketCreated(callback: (event: TicketCreatedEvent) => void) {
    const unsub = store.onTicketCreated(callback)
    unsubscribers.push(unsub)
    return unsub
  }

  function onTicketUpdated(callback: (event: TicketUpdatedEvent) => void) {
    const unsub = store.onTicketUpdated(callback)
    unsubscribers.push(unsub)
    return unsub
  }

  function onTicketStatusChanged(callback: (event: TicketStatusChangedEvent) => void) {
    const unsub = store.onTicketStatusChanged(callback)
    unsubscribers.push(unsub)
    return unsub
  }

  function onTicketAssigned(callback: (event: TicketAssignedEvent) => void) {
    const unsub = store.onTicketAssigned(callback)
    unsubscribers.push(unsub)
    return unsub
  }

  function onWorklogAdded(callback: (event: WorklogAddedEvent) => void) {
    const unsub = store.onWorklogAdded(callback)
    unsubscribers.push(unsub)
    return unsub
  }

  function onNotification(callback: (event: NotificationEvent) => void) {
    const unsub = store.onNotification(callback)
    unsubscribers.push(unsub)
    return unsub
  }

  return {
    // State
    isConnected: computed(() => store.isConnected),
    isTicketsConnected: computed(() => store.isTicketsConnected),
    isNotificationsConnected: computed(() => store.isNotificationsConnected),
    ticketsConnectionState: computed(() => store.ticketsConnectionState),
    notificationsConnectionState: computed(() => store.notificationsConnectionState),
    recentEvents: computed(() => store.recentEvents),
    unreadNotificationCount: computed(() => store.unreadNotificationCount),

    // Subscription methods
    onTicketCreated,
    onTicketUpdated,
    onTicketStatusChanged,
    onTicketAssigned,
    onWorklogAdded,
    onNotification,

    // Other methods
    markNotificationsRead: store.markNotificationsRead,
    clearEvents: store.clearEvents,
    getEventsByType: store.getEventsByType,
    getEventsForTicket: store.getEventsForTicket,
    reconnect: store.reconnect,
  }
}
