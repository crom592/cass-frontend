<template>
  <div class="ticket-list">
    <Navbar />

    <div class="content">
      <div class="page-header">
        <h1>{{ t('ticket.tickets') }}</h1>
        <router-link to="/tickets/new" class="btn-primary">
          {{ t('ticket.newTicket') }}
        </router-link>
      </div>

      <!-- Filter Section -->
      <div class="filter-card">
        <div class="filter-grid">
          <div class="filter-group">
            <label for="status-filter">{{ t('filter.status') }}</label>
            <select
              id="status-filter"
              v-model="filters.status"
              @change="handleFilterChange"
            >
              <option value="">{{ t('filter.allStatuses') }}</option>
              <option v-for="status in statusOptions" :key="status.value" :value="status.value">
                {{ status.label }}
              </option>
            </select>
          </div>

          <div class="filter-group">
            <label for="priority-filter">{{ t('filter.priority') }}</label>
            <select
              id="priority-filter"
              v-model="filters.priority"
              @change="handleFilterChange"
            >
              <option value="">{{ t('filter.allPriorities') }}</option>
              <option v-for="priority in priorityOptions" :key="priority.value" :value="priority.value">
                {{ priority.label }}
              </option>
            </select>
          </div>

          <div class="filter-group">
            <label for="category-filter">{{ t('filter.category') }}</label>
            <select
              id="category-filter"
              v-model="filters.category"
              @change="handleFilterChange"
            >
              <option value="">{{ t('filter.allCategories') }}</option>
              <option v-for="category in categoryOptions" :key="category.value" :value="category.value">
                {{ category.label }}
              </option>
            </select>
          </div>

          <div class="filter-group">
            <label for="search-input">{{ t('filter.search') }}</label>
            <input
              id="search-input"
              type="text"
              v-model="filters.search"
              :placeholder="t('ticket.searchPlaceholder')"
              @input="handleSearchInput"
            />
          </div>

          <div class="filter-group filter-actions">
            <label>&nbsp;</label>
            <button @click="clearFilters" class="btn-clear">
              {{ t('filter.clearFilters') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>{{ t('ticket.loadingTickets') }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="tickets.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
        </div>
        <h3>{{ t('ticket.noTicketsFound') }}</h3>
        <p>{{ t('ticket.noTicketsFoundDesc') }}</p>
        <router-link to="/tickets/new" class="btn-primary">
          {{ t('ticket.createNewTicket') }}
        </router-link>
      </div>

      <!-- Tickets Table -->
      <div v-else class="table-card">
        <!-- Real-time indicator -->
        <div class="realtime-indicator" :class="{ connected: sseConnected }">
          <span class="indicator-dot"></span>
          <span class="indicator-text">{{ sseConnected ? t('ticket.liveUpdatesEnabled') : t('ticket.connecting') }}</span>
        </div>

        <table class="tickets-table">
          <thead>
            <tr>
              <th>{{ t('ticket.ticketNumber') }}</th>
              <th>{{ t('ticket.title') }}</th>
              <th>{{ t('ticket.status') }}</th>
              <th>{{ t('ticket.priority') }}</th>
              <th>{{ t('ticket.category') }}</th>
              <th>{{ t('ticket.createdAt') }}</th>
              <th>{{ t('ticket.sla') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="ticket in tickets"
              :key="ticket.id"
              :class="{ 'recently-updated': isRecentlyUpdated(ticket.id) }"
            >
              <td>
                <router-link :to="`/tickets/${ticket.id}`" class="ticket-link">
                  {{ ticket.ticket_number }}
                </router-link>
              </td>
              <td class="title-cell">{{ ticket.title }}</td>
              <td>
                <span :class="['badge', 'badge-status', `status-${ticket.current_status}`]">
                  {{ translateStatus(ticket.current_status) }}
                </span>
              </td>
              <td>
                <span :class="['badge', 'badge-priority', `priority-${ticket.priority}`]">
                  {{ translatePriority(ticket.priority) }}
                </span>
              </td>
              <td>{{ translateCategory(ticket.category) }}</td>
              <td>{{ formatDateTime(ticket.created_at) }}</td>
              <td>
                <span :class="['sla-indicator', ticket.sla_breached ? 'sla-breached' : 'sla-ok']">
                  {{ ticket.sla_breached ? t('ticket.slaBreach') : t('ticket.slaOnTrack') }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="pagination">
          <div class="pagination-info">
            {{ t('ticket.showing', { start: paginationStart, end: paginationEnd, total: totalItems }) }}
          </div>
          <div class="pagination-controls">
            <button
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage === 1"
              class="pagination-btn"
            >
              {{ t('common.previous') }}
            </button>
            <span class="page-numbers">
              <button
                v-for="page in visiblePages"
                :key="page"
                @click="goToPage(page)"
                :class="['page-btn', { active: page === currentPage }]"
              >
                {{ page }}
              </button>
            </span>
            <button
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="pagination-btn"
            >
              {{ t('common.next') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue3-toastify'
import Navbar from '@/components/Navbar.vue'
import { apiClient } from '@/services/api'
import type { Ticket } from '@/types/index'
import { TicketStatus, TicketPriority, TicketCategory } from '@/types/index'
import { useSSE } from '@/stores/sse'
import { useEnumTranslation, useDateTimeFormat } from '@/composables/useI18n'

const { t } = useI18n()
const { translateStatus, translatePriority, translateCategory, getStatusOptions, getPriorityOptions, getCategoryOptions } = useEnumTranslation()
const { formatDateTime } = useDateTimeFormat()

// SSE for real-time updates
const {
  onTicketCreated,
  onTicketUpdated,
  onTicketStatusChanged,
  isConnected: sseConnected
} = useSSE()

// State
const tickets = ref<Ticket[]>([])
const loading = ref(true)
const currentPage = ref(1)
const pageSize = ref(20)
const totalItems = ref(0)
const recentlyUpdatedTicketIds = ref<Set<string>>(new Set())

// Filters
const filters = ref({
  status: '',
  priority: '',
  category: '',
  search: '',
})

// Debounce timer for search
let searchTimeout: ReturnType<typeof setTimeout> | null = null

// Filter Options - computed to be reactive to locale changes
const statusOptions = computed(() => getStatusOptions())
const priorityOptions = computed(() => getPriorityOptions())
const categoryOptions = computed(() => getCategoryOptions())

// Computed
const totalPages = computed(() => Math.ceil(totalItems.value / pageSize.value))

const paginationStart = computed(() => {
  if (totalItems.value === 0) return 0
  return (currentPage.value - 1) * pageSize.value + 1
})

const paginationEnd = computed(() => {
  return Math.min(currentPage.value * pageSize.value, totalItems.value)
})

const visiblePages = computed(() => {
  const pages: number[] = []
  const maxVisible = 5
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  const end = Math.min(totalPages.value, start + maxVisible - 1)

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  return pages
})

// Methods
async function fetchTickets() {
  loading.value = true
  try {
    const params: Record<string, string | number> = {
      skip: (currentPage.value - 1) * pageSize.value,
      limit: pageSize.value,
    }

    if (filters.value.status) {
      params.status = filters.value.status
    }
    if (filters.value.priority) {
      params.priority = filters.value.priority
    }
    if (filters.value.category) {
      params.category = filters.value.category
    }
    if (filters.value.search) {
      params.search = filters.value.search
    }

    const response = await apiClient.getTickets(params)

    // Handle paginated response
    if (Array.isArray(response)) {
      tickets.value = response
      totalItems.value = response.length
    } else if (response.items) {
      tickets.value = response.items
      totalItems.value = response.total || response.items.length
    } else {
      tickets.value = []
      totalItems.value = 0
    }
  } catch (error) {
    console.error('Failed to fetch tickets:', error)
    tickets.value = []
    totalItems.value = 0
  } finally {
    loading.value = false
  }
}

function handleFilterChange() {
  currentPage.value = 1
  fetchTickets()
}

function handleSearchInput() {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchTickets()
  }, 300)
}

function clearFilters() {
  filters.value = {
    status: '',
    priority: '',
    category: '',
    search: '',
  }
  currentPage.value = 1
  fetchTickets()
}

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    fetchTickets()
  }
}


// Handle real-time ticket creation
function handleTicketCreated(event: { ticket: Ticket; timestamp: string }) {
  // Add new ticket to the top of the list if on first page
  if (currentPage.value === 1) {
    // Check if ticket matches current filters
    const matchesFilters = checkTicketMatchesFilters(event.ticket)

    if (matchesFilters) {
      // Add to top of list
      tickets.value.unshift(event.ticket)
      totalItems.value++

      // Trim list if exceeds page size
      if (tickets.value.length > pageSize.value) {
        tickets.value.pop()
      }

      // Highlight the new ticket
      recentlyUpdatedTicketIds.value.add(event.ticket.id)
      setTimeout(() => {
        recentlyUpdatedTicketIds.value.delete(event.ticket.id)
      }, 5000)
    }
  }

  // Show toast notification
  toast.info(t('message.info.ticketCreatedByOther', { ticketNumber: event.ticket.ticket_number }), {
    autoClose: 5000,
    onClick: () => {
      window.location.href = `/tickets/${event.ticket.id}`
    }
  })
}

// Handle real-time ticket update
function handleTicketUpdated(event: { ticket: Ticket; updated_fields: Record<string, any>; timestamp: string }) {
  const index = tickets.value.findIndex(t => t.id === event.ticket.id)
  if (index !== -1) {
    tickets.value[index] = event.ticket

    // Highlight the updated ticket
    recentlyUpdatedTicketIds.value.add(event.ticket.id)
    setTimeout(() => {
      recentlyUpdatedTicketIds.value.delete(event.ticket.id)
    }, 3000)
  }
}

// Handle real-time status change
function handleTicketStatusChanged(event: { ticket: Ticket; old_status: string; new_status: string; timestamp: string }) {
  const index = tickets.value.findIndex(t => t.id === event.ticket.id)
  if (index !== -1) {
    tickets.value[index] = event.ticket

    // Highlight the updated ticket
    recentlyUpdatedTicketIds.value.add(event.ticket.id)
    setTimeout(() => {
      recentlyUpdatedTicketIds.value.delete(event.ticket.id)
    }, 3000)

    // Show toast for status change
    toast.info(
      t('message.info.statusChangedByOther', {
        oldStatus: translateStatus(event.old_status),
        newStatus: translateStatus(event.new_status)
      }),
      { autoClose: 4000 }
    )
  }
}

// Check if ticket matches current filters
function checkTicketMatchesFilters(ticket: Ticket): boolean {
  if (filters.value.status && ticket.current_status !== filters.value.status) {
    return false
  }
  if (filters.value.priority && ticket.priority !== filters.value.priority) {
    return false
  }
  if (filters.value.category && ticket.category !== filters.value.category) {
    return false
  }
  if (filters.value.search) {
    const searchLower = filters.value.search.toLowerCase()
    const matchesSearch =
      ticket.ticket_number.toLowerCase().includes(searchLower) ||
      ticket.title.toLowerCase().includes(searchLower)
    if (!matchesSearch) {
      return false
    }
  }
  return true
}

// Check if ticket was recently updated (for highlighting)
function isRecentlyUpdated(ticketId: string): boolean {
  return recentlyUpdatedTicketIds.value.has(ticketId)
}

// Lifecycle
onMounted(() => {
  fetchTickets()

  // Set up SSE event handlers
  onTicketCreated(handleTicketCreated)
  onTicketUpdated(handleTicketUpdated)
  onTicketStatusChanged(handleTicketStatusChanged)
})
</script>

<style scoped>
.ticket-list {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  color: #333;
  margin: 0;
}

/* Buttons */
.btn-primary {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 700;
  transition: all 0.2s;
  background-color: #EB5D19;
  color: white;
  border: none;
  cursor: pointer;
}

.btn-primary:hover {
  background-color: #d14d12;
  transform: translateY(-1px);
}

.btn-clear {
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-weight: 500;
  background: white;
  color: #666;
  border: 1px solid #ddd;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

/* Filter Card */
.filter-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #666;
}

.filter-group select,
.filter-group input {
  padding: 0.625rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #333;
  background: white;
  transition: border-color 0.2s;
}

.filter-group select:focus,
.filter-group input:focus {
  outline: none;
  border-color: #EB5D19;
  box-shadow: 0 0 0 3px rgba(235, 93, 25, 0.1);
}

.filter-actions {
  justify-self: start;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #EB5D19;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-state p {
  color: #666;
  font-size: 0.9rem;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.empty-icon {
  color: #ccc;
  margin-bottom: 1.5rem;
}

.empty-state h3 {
  color: #333;
  margin: 0 0 0.5rem;
}

.empty-state p {
  color: #666;
  margin: 0 0 1.5rem;
}

/* Table Card */
.table-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Real-time indicator */
.realtime-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
  font-size: 0.8rem;
  color: #999;
}

.realtime-indicator.connected {
  color: #27ae60;
}

.indicator-dot {
  width: 8px;
  height: 8px;
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
    transform: scale(1.2);
  }
}

.indicator-text {
  font-weight: 500;
}

/* Recently updated row highlight */
.tickets-table tbody tr.recently-updated {
  animation: highlight-row 3s ease-out;
}

@keyframes highlight-row {
  0% {
    background-color: #fff3e0;
  }
  100% {
    background-color: transparent;
  }
}

.tickets-table {
  width: 100%;
  border-collapse: collapse;
}

.tickets-table th,
.tickets-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.tickets-table th {
  background: #fafafa;
  font-weight: 600;
  color: #666;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tickets-table tbody tr:hover {
  background: #f9f9f9;
}

.tickets-table tbody tr:last-child td {
  border-bottom: none;
}

.ticket-link {
  color: #EB5D19;
  text-decoration: none;
  font-weight: 700;
}

.ticket-link:hover {
  text-decoration: underline;
}

.title-cell {
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 0.25rem 0.625rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-status {
  background: #f0f0f0;
  color: #666;
}

.badge-status.status-new {
  background: #e3f2fd;
  color: #1976d2;
}

.badge-status.status-assigned {
  background: #f3e5f5;
  color: #7b1fa2;
}

.badge-status.status-in_progress {
  background: #fff3e0;
  color: #f57c00;
}

.badge-status.status-pending_customer,
.badge-status.status-pending_vendor {
  background: #fce4ec;
  color: #c2185b;
}

.badge-status.status-resolved {
  background: #e8f5e9;
  color: #388e3c;
}

.badge-status.status-closed {
  background: #eceff1;
  color: #546e7a;
}

.badge-status.status-cancelled {
  background: #ffebee;
  color: #d32f2f;
}

.badge-priority.priority-critical {
  background: #ffebee;
  color: #e74c3c;
}

.badge-priority.priority-high {
  background: #fff3e0;
  color: #f39c12;
}

.badge-priority.priority-medium {
  background: #e7f5ff;
  color: #1971c2;
}

.badge-priority.priority-low {
  background: #e8f5e9;
  color: #27ae60;
}

/* SLA Indicator */
.sla-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8rem;
  font-weight: 500;
}

.sla-indicator::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.sla-ok {
  color: #27ae60;
}

.sla-ok::before {
  background: #27ae60;
}

.sla-breached {
  color: #e74c3c;
}

.sla-breached::before {
  background: #e74c3c;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid #eee;
  background: #fafafa;
}

.pagination-info {
  color: #666;
  font-size: 0.875rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pagination-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  color: #333;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  border-color: #EB5D19;
  color: #EB5D19;
  background-color: #fff5f0;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.page-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  color: #333;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover {
  border-color: #EB5D19;
  color: #EB5D19;
}

.page-btn.active {
  background-color: #EB5D19;
  color: white;
  border-color: transparent;
  font-weight: 700;
}

/* Responsive */
@media (max-width: 768px) {
  .content {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .page-header .btn-primary {
    text-align: center;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .tickets-table {
    display: block;
    overflow-x: auto;
  }

  .pagination {
    flex-direction: column;
    gap: 1rem;
  }

  .pagination-controls {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
