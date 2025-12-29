export interface User {
  id: string
  tenant_id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export enum UserRole {
  ADMIN = 'admin',
  TENANT_ADMIN = 'tenant_admin',
  CALL_CENTER = 'call_center',
  AS_MANAGER = 'as_manager',
  AS_ENGINEER = 'as_engineer',
  VIEWER = 'viewer',
}

export interface Ticket {
  id: string
  tenant_id: string
  site_id: string
  charger_id: string | null
  ticket_number: string
  title: string
  description: string | null
  channel: TicketChannel
  category: TicketCategory
  priority: TicketPriority
  current_status: TicketStatus
  reporter_name: string | null
  reporter_email: string | null
  reporter_phone: string | null
  opened_at: string
  closed_at: string | null
  resolved_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  sla_breached: boolean
  resolution_summary: string | null
}

export enum TicketChannel {
  PHONE = 'phone',
  EMAIL = 'email',
  WEB = 'web',
  MOBILE = 'mobile',
  AUTO = 'auto',
}

export enum TicketCategory {
  HARDWARE = 'hardware',
  SOFTWARE = 'software',
  NETWORK = 'network',
  POWER = 'power',
  CONNECTOR = 'connector',
  FIRMWARE = 'firmware',
  OTHER = 'other',
}

export enum TicketPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum TicketStatus {
  NEW = 'new',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  PENDING_CUSTOMER = 'pending_customer',
  PENDING_VENDOR = 'pending_vendor',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

export interface Site {
  id: string
  tenant_id: string
  name: string
  code: string
  address: string | null
  city: string | null
  is_active: boolean
  created_at: string
}

export interface Charger {
  id: string
  tenant_id: string
  site_id: string
  name: string
  serial_number: string
  vendor: string | null
  model: string | null
  firmware_version: string | null
  current_status: string | null
  is_active: boolean
}

export interface Worklog {
  id: string
  ticket_id: string
  body: string
  work_type: WorkType
  time_spent_minutes: number | null
  is_internal: boolean
  author_id: string
  created_at: string
  updated_at: string
}

export enum WorkType {
  DIAGNOSIS = 'diagnosis',
  REPAIR = 'repair',
  TESTING = 'testing',
  COMMUNICATION = 'communication',
  TRAVEL = 'travel',
  WAITING = 'waiting',
  OTHER = 'other',
}

// CSMS Types
export enum ChargerOperationalStatus {
  AVAILABLE = 'available',
  CHARGING = 'charging',
  UNAVAILABLE = 'unavailable',
  FAULTED = 'faulted',
  RESERVED = 'reserved',
  UNKNOWN = 'unknown',
}

export enum EventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

export interface ChargerStatus {
  id: string
  name: string
  serial_number: string
  vendor: string | null
  model: string | null
  firmware_version: string | null
  operational_status: ChargerOperationalStatus | string
  last_communication: string | null
}

export interface ChargerEvent {
  id: string
  charger_id: string
  event_type: string
  timestamp: string
  message?: string
  details?: string
  severity: EventSeverity
}

// SSE Event Types
export interface SSETicketEvent {
  ticket: Ticket
  timestamp: string
}

export interface SSETicketCreatedEvent extends SSETicketEvent {}

export interface SSETicketUpdatedEvent extends SSETicketEvent {
  updated_fields: Record<string, any>
}

export interface SSETicketStatusChangedEvent extends SSETicketEvent {
  old_status: TicketStatus
  new_status: TicketStatus
  reason?: string
}

export interface SSEWorklogAddedEvent {
  worklog: Worklog
  ticket: {
    id: string
    ticket_number: string
    title: string
  }
  timestamp: string
}

export interface SSENotificationEvent {
  type: string
  title: string
  message: string
  data?: Record<string, any>
  timestamp: string
}
