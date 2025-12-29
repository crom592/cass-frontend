<template>
  <div class="ticket-detail-page">
    <Navbar />

    <div class="content">
      <!-- Loading State -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>{{ t('ticket.loadingTicket') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-container">
        <div class="error-card">
          <h2>{{ t('ticket.ticketNotFound') }}</h2>
          <p>{{ error }}</p>
          <router-link to="/tickets" class="btn-primary">{{ t('ticket.backToTickets') }}</router-link>
        </div>
      </div>

      <!-- Ticket Detail Content -->
      <div v-else-if="ticket" class="ticket-layout">
        <!-- Breadcrumb -->
        <div class="breadcrumb">
          <router-link to="/tickets">{{ t('nav.tickets') }}</router-link>
          <span class="separator">/</span>
          <span>{{ ticket.ticket_number }}</span>
        </div>

        <!-- Main Content Area -->
        <div class="main-grid">
          <!-- Left Column - Main Content -->
          <div class="main-column">
            <!-- Ticket Header Card -->
            <div class="card ticket-header-card">
              <div class="ticket-header">
                <div class="ticket-title-section">
                  <h1>{{ ticket.ticket_number }}</h1>
                  <h2>{{ ticket.title }}</h2>
                </div>
                <div class="ticket-badges">
                  <span :class="['badge', 'status-badge', `status-${ticket.current_status}`, { 'status-flash': statusJustChanged }]">
                    {{ translateStatus(ticket.current_status) }}
                  </span>
                  <span :class="['badge', 'priority-badge', `priority-${ticket.priority}`]">
                    {{ translatePriority(ticket.priority) }}
                  </span>
                  <span class="badge category-badge">
                    {{ translateCategory(ticket.category) }}
                  </span>
                  <span v-if="ticket.sla_breached" class="badge sla-breach-badge">
                    {{ t('ticket.slaBreached') }}
                  </span>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="action-buttons">
                <div class="status-actions">
                  <label>{{ t('ticketAction.changeStatus') }}:</label>
                  <select
                    v-model="selectedStatus"
                    @change="handleStatusChange"
                    class="status-select"
                    :disabled="statusChanging"
                  >
                    <option value="" disabled>{{ t('ticketAction.selectStatus') }}</option>
                    <option
                      v-for="status in availableStatuses"
                      :key="status"
                      :value="status"
                    >
                      {{ translateStatus(status) }}
                    </option>
                  </select>
                </div>
                <button @click="showAssignModal = true" class="btn-secondary">
                  {{ t('ticketAction.assign') }}
                </button>
                <button @click="showWorklogModal = true" class="btn-secondary">
                  {{ t('ticketAction.addWorklog') }}
                </button>
                <button @click="showEditModal = true" class="btn-outline">
                  {{ t('common.edit') }}
                </button>
              </div>
            </div>

            <!-- Ticket Info Card -->
            <div class="card ticket-info-card">
              <h3>{{ t('ticket.ticketInformation') }}</h3>

              <!-- Description -->
              <div v-if="ticket.description" class="info-section">
                <h4>{{ t('ticket.description') }}</h4>
                <p class="description-text">{{ ticket.description }}</p>
              </div>

              <!-- Reporter Info -->
              <div class="info-section">
                <h4>{{ t('reporter.title') }}</h4>
                <div class="info-grid">
                  <div class="info-item">
                    <label>{{ t('reporter.name') }}</label>
                    <span>{{ ticket.reporter_name || t('common.na') }}</span>
                  </div>
                  <div class="info-item">
                    <label>{{ t('reporter.email') }}</label>
                    <span>{{ ticket.reporter_email || t('common.na') }}</span>
                  </div>
                  <div class="info-item">
                    <label>{{ t('reporter.phone') }}</label>
                    <span>{{ ticket.reporter_phone || t('common.na') }}</span>
                  </div>
                </div>
              </div>

              <!-- Timestamps -->
              <div class="info-section">
                <h4>{{ t('timestamps.title') }}</h4>
                <div class="info-grid">
                  <div class="info-item">
                    <label>{{ t('ticket.createdAt') }}</label>
                    <span>{{ formatDateTime(ticket.created_at) }}</span>
                  </div>
                  <div class="info-item">
                    <label>{{ t('ticket.openedAt') }}</label>
                    <span>{{ formatDateTime(ticket.opened_at) }}</span>
                  </div>
                  <div v-if="ticket.resolved_at" class="info-item">
                    <label>{{ t('ticket.resolvedAt') }}</label>
                    <span>{{ formatDateTime(ticket.resolved_at) }}</span>
                  </div>
                  <div v-if="ticket.closed_at" class="info-item">
                    <label>{{ t('ticket.closedAt') }}</label>
                    <span>{{ formatDateTime(ticket.closed_at) }}</span>
                  </div>
                </div>
              </div>

              <!-- Resolution Summary -->
              <div v-if="ticket.resolution_summary" class="info-section">
                <h4>{{ t('ticket.resolutionSummary') }}</h4>
                <p class="description-text">{{ ticket.resolution_summary }}</p>
              </div>
            </div>

            <!-- Timeline Component -->
            <div class="card timeline-card">
              <div class="timeline-header-row">
                <h3>{{ t('ticket.timeline') }}</h3>
                <div class="realtime-indicator" :class="{ connected: sseConnected }">
                  <span class="indicator-dot"></span>
                  <span class="indicator-text">{{ sseConnected ? t('ticket.live') : '...' }}</span>
                </div>
              </div>
              <Timeline ref="timelineRef" :ticket-id="ticketId" />
            </div>
          </div>

          <!-- Right Sidebar -->
          <div class="sidebar-column">
            <!-- CSMS Panel (only if charger_id exists) -->
            <div v-if="ticket.charger_id" class="card csms-card">
              <h3>{{ t('asset.chargerStatus') }}</h3>
              <CSMSPanel :charger-id="ticket.charger_id" />
            </div>

            <!-- Additional Info Card -->
            <div class="card sidebar-info-card">
              <h3>{{ t('additional.title') }}</h3>
              <div class="sidebar-info-list">
                <div class="sidebar-info-item">
                  <label>{{ t('ticket.channel') }}</label>
                  <span>{{ translateChannel(ticket.channel) }}</span>
                </div>
                <div class="sidebar-info-item">
                  <label>{{ t('asset.siteId') }}</label>
                  <span>{{ ticket.site_id }}</span>
                </div>
                <div v-if="ticket.charger_id" class="sidebar-info-item">
                  <label>{{ t('asset.chargerId') }}</label>
                  <span>{{ ticket.charger_id }}</span>
                </div>
                <div class="sidebar-info-item">
                  <label>{{ t('additional.createdBy') }}</label>
                  <span>{{ ticket.created_by }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Assignment Modal -->
    <div v-if="showAssignModal" class="modal-overlay" @click.self="showAssignModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ t('ticketAction.assignTicket') }}</h3>
          <button @click="showAssignModal = false" class="modal-close">&times;</button>
        </div>
        <form @submit.prevent="handleAssign" class="modal-body">
          <div class="form-group">
            <label for="assignee_id">{{ t('assign.assigneeId') }} *</label>
            <input
              type="text"
              id="assignee_id"
              v-model="assignForm.assignee_id"
              required
              :placeholder="t('assign.enterAssigneeId')"
            />
          </div>
          <div class="form-group">
            <label for="vendor_name">{{ t('assign.vendorName') }}</label>
            <input
              type="text"
              id="vendor_name"
              v-model="assignForm.vendor_name"
              :placeholder="t('assign.enterVendorName')"
            />
          </div>
          <div class="form-group">
            <label for="due_date">{{ t('assign.dueDate') }}</label>
            <input
              type="datetime-local"
              id="due_date"
              v-model="assignForm.due_date"
            />
          </div>
          <div class="modal-actions">
            <button type="button" @click="showAssignModal = false" class="btn-outline">{{ t('common.cancel') }}</button>
            <button type="submit" class="btn-primary" :disabled="assigning">
              {{ assigning ? t('ticketAction.assigning') : t('ticketAction.assign') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Worklog Modal -->
    <div v-if="showWorklogModal" class="modal-overlay" @click.self="showWorklogModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ t('ticketAction.addWorklog') }}</h3>
          <button @click="showWorklogModal = false" class="modal-close">&times;</button>
        </div>
        <form @submit.prevent="handleCreateWorklog" class="modal-body">
          <div class="form-group">
            <label for="worklog_body">{{ t('worklog.description') }} *</label>
            <textarea
              id="worklog_body"
              v-model="worklogForm.body"
              required
              rows="4"
              :placeholder="t('worklog.descriptionPlaceholder')"
            ></textarea>
          </div>
          <div class="form-group">
            <label for="work_type">{{ t('worklog.workType') }} *</label>
            <select id="work_type" v-model="worklogForm.work_type" required>
              <option v-for="option in workTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="time_spent">{{ t('worklog.timeSpent') }}</label>
            <input
              type="number"
              id="time_spent"
              v-model.number="worklogForm.time_spent_minutes"
              min="0"
              :placeholder="t('worklog.enterTimeSpent')"
            />
          </div>
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" v-model="worklogForm.is_internal" />
              {{ t('worklog.internalNote') }}
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showWorklogModal = false" class="btn-outline">{{ t('common.cancel') }}</button>
            <button type="submit" class="btn-primary" :disabled="creatingWorklog">
              {{ creatingWorklog ? t('ticketAction.creatingWorklog') : t('ticketAction.addWorklog') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ t('ticket.editTicket') }}</h3>
          <button @click="showEditModal = false" class="modal-close">&times;</button>
        </div>
        <form @submit.prevent="handleEdit" class="modal-body">
          <div class="form-group">
            <label for="edit_title">{{ t('ticket.title') }} *</label>
            <input
              type="text"
              id="edit_title"
              v-model="editForm.title"
              required
            />
          </div>
          <div class="form-group">
            <label for="edit_description">{{ t('ticket.description') }}</label>
            <textarea
              id="edit_description"
              v-model="editForm.description"
              rows="4"
            ></textarea>
          </div>
          <div class="form-group">
            <label for="edit_priority">{{ t('ticket.priority') }}</label>
            <select id="edit_priority" v-model="editForm.priority">
              <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="edit_category">{{ t('ticket.category') }}</label>
            <select id="edit_category" v-model="editForm.category">
              <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showEditModal = false" class="btn-outline">{{ t('common.cancel') }}</button>
            <button type="submit" class="btn-primary" :disabled="editing">
              {{ editing ? t('ticketAction.saving') : t('ticketAction.saveChanges') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Status Change Note Modal -->
    <div v-if="showStatusNoteModal" class="modal-overlay" @click.self="cancelStatusChange">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ t('ticketAction.changeStatus') }}: {{ translateStatus(pendingStatus) }}</h3>
          <button @click="cancelStatusChange" class="modal-close">&times;</button>
        </div>
        <form @submit.prevent="confirmStatusChange" class="modal-body">
          <div class="form-group">
            <label for="status_note">{{ t('ticketAction.statusChangeNote') }}</label>
            <textarea
              id="status_note"
              v-model="statusNote"
              rows="3"
              :placeholder="t('ticketAction.statusChangeNotePlaceholder')"
            ></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" @click="cancelStatusChange" class="btn-outline">{{ t('common.cancel') }}</button>
            <button type="submit" class="btn-primary" :disabled="statusChanging">
              {{ statusChanging ? t('ticketAction.changing') : t('common.confirm') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue3-toastify'
import Navbar from '@/components/Navbar.vue'
import Timeline from '@/components/Timeline.vue'
import CSMSPanel from '@/components/CSMSPanel.vue'
import { apiClient } from '@/services/api'
import type { Ticket } from '@/types/index'
import { TicketStatus } from '@/types/index'
import { useSSE } from '@/stores/sse'
import { useEnumTranslation, useDateTimeFormat } from '@/composables/useI18n'

const { t } = useI18n()
const route = useRoute()
const {
  translateStatus,
  translatePriority,
  translateCategory,
  translateChannel,
  getPriorityOptions,
  getCategoryOptions,
  getWorkTypeOptions
} = useEnumTranslation()
const { formatDateTime } = useDateTimeFormat()

// Computed options for dropdowns
const priorityOptions = computed(() => getPriorityOptions())
const categoryOptions = computed(() => getCategoryOptions())
const workTypeOptions = computed(() => getWorkTypeOptions())

// SSE for real-time updates
const {
  onTicketUpdated,
  onTicketStatusChanged,
  onWorklogAdded,
  isConnected: sseConnected
} = useSSE()

// Timeline component ref
const timelineRef = ref<InstanceType<typeof Timeline> | null>(null)

// State
const ticket = ref<Ticket | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const statusJustChanged = ref(false)

// Modal states
const showAssignModal = ref(false)
const showWorklogModal = ref(false)
const showEditModal = ref(false)
const showStatusNoteModal = ref(false)

// Action states
const statusChanging = ref(false)
const assigning = ref(false)
const creatingWorklog = ref(false)
const editing = ref(false)

// Status change
const selectedStatus = ref('')
const pendingStatus = ref('')
const statusNote = ref('')

// Form data
const assignForm = reactive({
  assignee_id: '',
  vendor_name: '',
  due_date: '',
})

const worklogForm = reactive({
  body: '',
  work_type: 'diagnosis' as string,
  time_spent_minutes: null as number | null,
  is_internal: false,
})

const editForm = reactive({
  title: '',
  description: '',
  priority: '',
  category: '',
})

// Computed
const ticketId = computed(() => route.params.id as string)

const availableStatuses = computed(() => {
  if (!ticket.value) return []

  const currentStatus = ticket.value.current_status

  // Define valid status transitions
  const transitions: Record<string, string[]> = {
    [TicketStatus.NEW]: [TicketStatus.ASSIGNED, TicketStatus.CANCELLED],
    [TicketStatus.ASSIGNED]: [TicketStatus.IN_PROGRESS, TicketStatus.PENDING_CUSTOMER, TicketStatus.PENDING_VENDOR, TicketStatus.CANCELLED],
    [TicketStatus.IN_PROGRESS]: [TicketStatus.PENDING_CUSTOMER, TicketStatus.PENDING_VENDOR, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
    [TicketStatus.PENDING_CUSTOMER]: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
    [TicketStatus.PENDING_VENDOR]: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
    [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
    [TicketStatus.CLOSED]: [],
    [TicketStatus.CANCELLED]: [],
  }

  return transitions[currentStatus] || []
})

// Methods
async function loadTicket() {
  loading.value = true
  error.value = null

  try {
    ticket.value = await apiClient.getTicket(ticketId.value)

    // Initialize edit form with current values
    if (ticket.value) {
      editForm.title = ticket.value.title
      editForm.description = ticket.value.description || ''
      editForm.priority = ticket.value.priority
      editForm.category = ticket.value.category
    }
  } catch (err: any) {
    if (err.response?.status === 404) {
      error.value = t('ticket.ticketNotFoundDesc')
    } else {
      error.value = t('message.error.ticketLoadFailed')
    }
    ticket.value = null
  } finally {
    loading.value = false
  }
}

function handleStatusChange() {
  if (!selectedStatus.value) return

  pendingStatus.value = selectedStatus.value
  showStatusNoteModal.value = true
}

async function confirmStatusChange() {
  if (!pendingStatus.value) return

  statusChanging.value = true

  try {
    await apiClient.changeTicketStatus(ticketId.value, {
      new_status: pendingStatus.value,
      note: statusNote.value || undefined,
    })

    toast.success(t('message.success.statusChanged', { status: translateStatus(pendingStatus.value) }))

    // Reset and reload
    showStatusNoteModal.value = false
    selectedStatus.value = ''
    pendingStatus.value = ''
    statusNote.value = ''

    await loadTicket()
  } catch (err) {
    toast.error(t('message.error.statusChangeFailed'))
  } finally {
    statusChanging.value = false
  }
}

function cancelStatusChange() {
  showStatusNoteModal.value = false
  selectedStatus.value = ''
  pendingStatus.value = ''
  statusNote.value = ''
}

async function handleAssign() {
  if (!assignForm.assignee_id) return

  assigning.value = true

  try {
    const data: any = {
      assignee_id: assignForm.assignee_id,
    }

    if (assignForm.vendor_name) {
      data.vendor_name = assignForm.vendor_name
    }

    if (assignForm.due_date) {
      data.due_date = new Date(assignForm.due_date).toISOString()
    }

    await apiClient.assignTicket(ticketId.value, data)

    toast.success(t('message.success.ticketAssigned'))

    // Reset form and close modal
    showAssignModal.value = false
    assignForm.assignee_id = ''
    assignForm.vendor_name = ''
    assignForm.due_date = ''

    await loadTicket()
  } catch (err) {
    toast.error(t('message.error.assignFailed'))
  } finally {
    assigning.value = false
  }
}

async function handleCreateWorklog() {
  if (!worklogForm.body) return

  creatingWorklog.value = true

  try {
    const data: any = {
      body: worklogForm.body,
      work_type: worklogForm.work_type,
      is_internal: worklogForm.is_internal,
    }

    if (worklogForm.time_spent_minutes) {
      data.time_spent_minutes = worklogForm.time_spent_minutes
    }

    await apiClient.createWorklog(ticketId.value, data)

    toast.success(t('message.success.worklogAdded'))

    // Reset form and close modal
    showWorklogModal.value = false
    worklogForm.body = ''
    worklogForm.work_type = 'diagnosis'
    worklogForm.time_spent_minutes = null
    worklogForm.is_internal = false

    // Reload to refresh timeline
    await loadTicket()
  } catch (err) {
    toast.error(t('message.error.worklogAddFailed'))
  } finally {
    creatingWorklog.value = false
  }
}

async function handleEdit() {
  editing.value = true

  try {
    await apiClient.updateTicket(ticketId.value, {
      title: editForm.title,
      description: editForm.description || null,
      priority: editForm.priority,
      category: editForm.category,
    })

    toast.success(t('message.success.ticketUpdated'))

    showEditModal.value = false
    await loadTicket()
  } catch (err) {
    toast.error(t('message.error.ticketUpdateFailed'))
  } finally {
    editing.value = false
  }
}


// Handle real-time ticket update
function handleTicketUpdated(event: { ticket: Ticket; updated_fields: Record<string, any>; timestamp: string }) {
  if (event.ticket.id === ticketId.value) {
    // Update the ticket data
    ticket.value = event.ticket

    // Update edit form
    editForm.title = event.ticket.title
    editForm.description = event.ticket.description || ''
    editForm.priority = event.ticket.priority
    editForm.category = event.ticket.category

    toast.info(t('message.info.ticketUpdatedByOther'), { autoClose: 3000 })
  }
}

// Handle real-time status change
function handleTicketStatusChanged(event: { ticket: Ticket; old_status: string; new_status: string; reason?: string; timestamp: string }) {
  if (event.ticket.id === ticketId.value) {
    // Update the ticket data
    ticket.value = event.ticket

    // Flash the status badge
    statusJustChanged.value = true
    setTimeout(() => {
      statusJustChanged.value = false
    }, 3000)

    toast.info(
      t('message.info.statusChangedByOther', {
        oldStatus: translateStatus(event.old_status),
        newStatus: translateStatus(event.new_status)
      }),
      { autoClose: 4000 }
    )

    // Refresh timeline to show status change entry
    timelineRef.value?.refresh()
  }
}

// Handle real-time worklog addition
function handleWorklogAdded(event: { worklog: any; ticket: { id: string; ticket_number: string; title: string }; timestamp: string }) {
  if (event.ticket.id === ticketId.value) {
    toast.info(t('message.info.worklogAddedByOther'), { autoClose: 3000 })

    // Refresh timeline to show new worklog
    timelineRef.value?.refresh()
  }
}

// Watch for route changes
watch(() => route.params.id, (newId) => {
  if (newId) {
    loadTicket()
  }
})

// Load ticket on mount
onMounted(() => {
  loadTicket()

  // Set up SSE event handlers for real-time updates
  onTicketUpdated(handleTicketUpdated)
  onTicketStatusChanged(handleTicketStatusChanged)
  onWorklogAdded(handleWorklogAdded)
})
</script>

<style scoped>
.ticket-detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

/* Loading State */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #666;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e0e0e0;
  border-top-color: #EB5D19;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Error State */
.error-container {
  display: flex;
  justify-content: center;
  padding: 4rem 0;
}

.error-card {
  background: white;
  padding: 3rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 400px;
}

.error-card h2 {
  color: #e74c3c;
  margin-bottom: 1rem;
}

.error-card p {
  color: #666;
  margin-bottom: 2rem;
}

/* Breadcrumb */
.breadcrumb {
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  color: #666;
}

.breadcrumb a {
  color: #EB5D19;
  text-decoration: none;
  font-weight: 600;
}

.breadcrumb a:hover {
  text-decoration: underline;
}

.breadcrumb .separator {
  margin: 0 0.5rem;
  color: #999;
}

/* Main Grid Layout */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 1.5rem;
}

@media (max-width: 1024px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
}

.main-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.sidebar-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Cards */
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.card h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #eee;
}

/* Timeline header with real-time indicator */
.timeline-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #eee;
}

.timeline-header-row h3 {
  margin: 0;
  padding: 0;
  border: none;
}

/* Real-time indicator */
.realtime-indicator {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: #999;
}

.realtime-indicator.connected {
  color: #27ae60;
}

.indicator-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ccc;
}

.realtime-indicator.connected .indicator-dot {
  background: #27ae60;
  animation: pulse-dot 2s infinite;
}

@keyframes pulse-dot {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.3);
  }
}

.indicator-text {
  font-weight: 500;
}

/* Status flash animation */
.status-flash {
  animation: flash-status 0.5s ease-in-out 3;
}

@keyframes flash-status {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 0 12px rgba(235, 93, 25, 0.5);
  }
}

/* Ticket Header Card */
.ticket-header-card {
  border-left: 4px solid #EB5D19;
}

.ticket-header {
  margin-bottom: 1.5rem;
}

.ticket-title-section h1 {
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.ticket-title-section h2 {
  font-size: 1.5rem;
  color: #333;
  font-weight: 600;
  margin-bottom: 1rem;
}

.ticket-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

/* Status Badge Colors */
.status-badge.status-new {
  background-color: #e8f4fd;
  color: #3498db;
}

.status-badge.status-assigned {
  background-color: #f3e8fd;
  color: #9b59b6;
}

.status-badge.status-in_progress {
  background-color: #fef5e7;
  color: #f39c12;
}

.status-badge.status-pending_customer {
  background-color: #fef5e7;
  color: #f39c12;
}

.status-badge.status-pending_vendor {
  background-color: #fef5e7;
  color: #f39c12;
}

.status-badge.status-resolved {
  background-color: #e8f8f0;
  color: #27ae60;
}

.status-badge.status-closed {
  background-color: #f0f0f0;
  color: #95a5a6;
}

.status-badge.status-cancelled {
  background-color: #fde8e8;
  color: #e74c3c;
}

/* Priority Badge Colors */
.priority-badge.priority-critical {
  background-color: #fde8e8;
  color: #e74c3c;
}

.priority-badge.priority-high {
  background-color: #fef5e7;
  color: #f39c12;
}

.priority-badge.priority-medium {
  background-color: #e7f5ff;
  color: #1971c2;
}

.priority-badge.priority-low {
  background-color: #e8f8f0;
  color: #27ae60;
}

/* Category Badge */
.category-badge {
  background-color: #f0f0f0;
  color: #555;
}

/* SLA Breach Badge */
.sla-breach-badge {
  background-color: #e74c3c;
  color: white;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Action Buttons */
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.status-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-actions label {
  font-size: 0.9rem;
  color: #666;
  white-space: nowrap;
}

.status-select {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  min-width: 160px;
  cursor: pointer;
}

.status-select:focus {
  outline: none;
  border-color: #EB5D19;
  box-shadow: 0 0 0 3px rgba(235, 93, 25, 0.1);
}

/* Ticket Info Card */
.info-section {
  margin-bottom: 1.5rem;
}

.info-section:last-child {
  margin-bottom: 0;
}

.info-section h4 {
  font-size: 0.85rem;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  margin-bottom: 0.75rem;
}

.description-text {
  color: #333;
  line-height: 1.6;
  white-space: pre-wrap;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item label {
  font-size: 0.8rem;
  color: #999;
  text-transform: uppercase;
}

.info-item span {
  color: #333;
  font-size: 0.95rem;
}

/* Sidebar Cards */
.sidebar-info-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sidebar-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}

.sidebar-info-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.sidebar-info-item label {
  font-size: 0.85rem;
  color: #666;
}

.sidebar-info-item span {
  font-size: 0.9rem;
  color: #333;
  font-weight: 500;
}

/* Buttons */
.btn-primary,
.btn-secondary,
.btn-outline {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-block;
}

.btn-primary {
  background-color: #EB5D19;
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background-color: #d14d12;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(235, 93, 25, 0.2);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #f8f9fa;
  color: #495057;
  border: 1px solid #dee2e6;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e9ecef;
  border-color: #ced4da;
}

.btn-outline {
  background: white;
  color: #EB5D19;
  border: 1px solid #EB5D19;
}

.btn-outline:hover:not(:disabled) {
  background: #fff5f0;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
  border: none;
  padding: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #999;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-close:hover {
  color: #333;
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group:last-of-type {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.5rem;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group input[type="datetime-local"],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid #eee;
}

/* Timeline Card */
.timeline-card {
  min-height: 300px;
}

/* CSMS Card */
.csms-card {
  border-left: 4px solid #27ae60;
}
</style>
