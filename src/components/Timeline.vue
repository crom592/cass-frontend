<template>
  <div class="timeline-container">
    <div class="timeline-header">
      <h3>{{ t('timeline.title') }}</h3>
      <button
        v-if="autoRefresh"
        @click="toggleAutoRefresh"
        class="btn-refresh"
        :class="{ active: isAutoRefreshEnabled }"
      >
        <span class="refresh-icon">&#8635;</span>
        {{ isAutoRefreshEnabled ? t('timeline.autoRefreshOn') : t('timeline.autoRefreshOff') }}
      </button>
      <button v-else @click="fetchData" class="btn-refresh" :disabled="loading">
        <span class="refresh-icon">&#8635;</span>
        {{ t('timeline.refresh') }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading && timelineItems.length === 0" class="timeline-loading">
      <div class="loading-spinner"></div>
      <p>{{ t('timeline.loading') }}</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading && timelineItems.length === 0" class="timeline-empty">
      <div class="empty-icon">&#128196;</div>
      <p>{{ t('timeline.noHistory') }}</p>
      <span class="empty-subtitle">{{ t('timeline.noHistorySubtitle') }}</span>
    </div>

    <!-- Timeline Items -->
    <div v-else class="timeline">
      <div
        v-for="item in timelineItems"
        :key="item.id"
        class="timeline-item"
        :class="item.type"
      >
        <div class="timeline-marker">
          <div class="marker-icon" :class="item.type">
            <span v-if="item.type === 'status_change'">&#8644;</span>
            <span v-else>&#128221;</span>
          </div>
          <div class="marker-line"></div>
        </div>

        <div class="timeline-content">
          <div class="timeline-card">
            <div class="card-header">
              <div class="header-left">
                <span class="author">{{ item.authorName }}</span>
                <span
                  v-if="item.type === 'worklog' && item.workType"
                  class="work-type-badge"
                  :style="{ backgroundColor: getWorkTypeColor(item.workType) }"
                >
                  {{ formatWorkType(item.workType) }}
                </span>
              </div>
              <span class="timestamp">{{ formatTimestamp(item.timestamp) }}</span>
            </div>

            <!-- Status Change Content -->
            <div v-if="item.type === 'status_change'" class="card-body status-change">
              <span class="status-label">{{ t('timeline.statusChanged') }}</span>
              <div class="status-transition">
                <span
                  class="status-badge"
                  :style="{ backgroundColor: getStatusColor(item.oldStatus) }"
                >
                  {{ formatStatus(item.oldStatus) }}
                </span>
                <span class="transition-arrow">&#8594;</span>
                <span
                  class="status-badge"
                  :style="{ backgroundColor: getStatusColor(item.newStatus) }"
                >
                  {{ formatStatus(item.newStatus) }}
                </span>
              </div>
              <p v-if="item.comment" class="change-comment">{{ item.comment }}</p>
            </div>

            <!-- Worklog Content -->
            <div v-else class="card-body worklog">
              <p class="worklog-body">{{ item.body }}</p>
              <div v-if="item.timeSpent" class="time-spent">
                <span class="time-icon">&#9201;</span>
                <span>{{ formatTimeSpent(item.timeSpent) }}</span>
              </div>
              <span v-if="item.isInternal" class="internal-badge">{{ t('timeline.internal') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="timeline-error">
      <p>{{ error }}</p>
      <button @click="fetchData" class="btn-retry">{{ t('timeline.retry') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiClient } from '@/services/api'
import { WorkType, type Worklog, TicketStatus } from '@/types/index'
import { useEnumTranslation, useDateTimeFormat, useNumberFormat } from '@/composables/useI18n'

const { t } = useI18n()
const { translateStatus, translateWorkType } = useEnumTranslation()
const { formatRelativeTime } = useDateTimeFormat()
const { formatMinutes } = useNumberFormat()

// Props
interface Props {
  ticketId: string
  autoRefresh?: boolean
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoRefresh: false,
  refreshInterval: 30000, // 30 seconds default
})

// Emits
const emit = defineEmits<{
  (e: 'loaded', count: number): void
  (e: 'error', error: string): void
}>()

// Types for internal use
interface StatusChangeEntry {
  id: string
  old_status: string | null
  new_status: string
  changed_at: string
  changed_by: string
  changed_by_name?: string
  comment?: string
}

interface TimelineItem {
  id: string
  type: 'status_change' | 'worklog'
  timestamp: string
  authorId: string
  authorName: string
  // Status change specific
  oldStatus?: string | null
  newStatus?: string
  comment?: string
  // Worklog specific
  body?: string
  workType?: WorkType
  timeSpent?: number | null
  isInternal?: boolean
}

// State
const loading = ref(false)
const error = ref<string | null>(null)
const worklogs = ref<Worklog[]>([])
const statusChanges = ref<StatusChangeEntry[]>([])
const isAutoRefreshEnabled = ref(false)
let refreshTimer: ReturnType<typeof setInterval> | null = null

// Work type colors
const workTypeColors: Record<WorkType, string> = {
  [WorkType.DIAGNOSIS]: '#3498db',
  [WorkType.REPAIR]: '#27ae60',
  [WorkType.TESTING]: '#9b59b6',
  [WorkType.COMMUNICATION]: '#f39c12',
  [WorkType.TRAVEL]: '#1abc9c',
  [WorkType.WAITING]: '#95a5a6',
  [WorkType.OTHER]: '#666666',
}

// Status colors
const statusColors: Record<string, string> = {
  [TicketStatus.NEW]: '#3498db',
  [TicketStatus.ASSIGNED]: '#9b59b6',
  [TicketStatus.IN_PROGRESS]: '#f39c12',
  [TicketStatus.PENDING_CUSTOMER]: '#e67e22',
  [TicketStatus.PENDING_VENDOR]: '#e74c3c',
  [TicketStatus.RESOLVED]: '#27ae60',
  [TicketStatus.CLOSED]: '#95a5a6',
  [TicketStatus.CANCELLED]: '#7f8c8d',
}

// Computed: Combined and sorted timeline items
const timelineItems = computed<TimelineItem[]>(() => {
  const items: TimelineItem[] = []

  // Add worklogs
  worklogs.value.forEach((worklog) => {
    items.push({
      id: `worklog-${worklog.id}`,
      type: 'worklog',
      timestamp: worklog.created_at,
      authorId: worklog.author_id,
      authorName: worklog.author_id, // Will be replaced with actual name if available
      body: worklog.body,
      workType: worklog.work_type,
      timeSpent: worklog.time_spent_minutes,
      isInternal: worklog.is_internal,
    })
  })

  // Add status changes
  statusChanges.value.forEach((change) => {
    items.push({
      id: `status-${change.id}`,
      type: 'status_change',
      timestamp: change.changed_at,
      authorId: change.changed_by,
      authorName: change.changed_by_name || change.changed_by,
      oldStatus: change.old_status,
      newStatus: change.new_status,
      comment: change.comment,
    })
  })

  // Sort by timestamp (newest first)
  return items.sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })
})

// Methods
async function fetchData() {
  loading.value = true
  error.value = null

  try {
    const [historyResponse, worklogsResponse] = await Promise.all([
      apiClient.getTicketHistory(props.ticketId),
      apiClient.getWorklogs(props.ticketId),
    ])

    statusChanges.value = historyResponse || []
    worklogs.value = worklogsResponse || []

    emit('loaded', timelineItems.value.length)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load timeline data'
    error.value = errorMessage
    emit('error', errorMessage)
  } finally {
    loading.value = false
  }
}

function getWorkTypeColor(type: WorkType): string {
  return workTypeColors[type] || '#666666'
}

function getStatusColor(status: string | null | undefined): string {
  if (!status) return '#95a5a6'
  return statusColors[status] || '#95a5a6'
}

function formatWorkType(type: WorkType): string {
  return translateWorkType(type)
}

function formatStatus(status: string | null | undefined): string {
  if (!status) return t('common.unknown')
  return translateStatus(status)
}

function formatTimestamp(timestamp: string): string {
  return formatRelativeTime(timestamp)
}

function formatTimeSpent(minutes: number | null): string {
  if (!minutes) return ''
  return formatMinutes(minutes)
}

function toggleAutoRefresh() {
  isAutoRefreshEnabled.value = !isAutoRefreshEnabled.value
  if (isAutoRefreshEnabled.value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

function startAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  refreshTimer = setInterval(() => {
    fetchData()
  }, props.refreshInterval)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// Lifecycle
onMounted(() => {
  fetchData()
  if (props.autoRefresh) {
    isAutoRefreshEnabled.value = true
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})

// Watch for ticketId changes
watch(
  () => props.ticketId,
  () => {
    fetchData()
  }
)

// Expose refresh method for parent components
defineExpose({
  refresh: fetchData,
})
</script>

<style scoped>
.timeline-container {
  width: 100%;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.timeline-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.btn-refresh {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  color: #495057;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-refresh:hover:not(:disabled) {
  background: #e9ecef;
  border-color: #ced4da;
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-refresh.active {
  background-color: #EB5D19;
  border-color: #EB5D19;
  color: white;
}

.refresh-icon {
  font-size: 1rem;
}

/* Loading State */
.timeline-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f0f0f0;
  border-top-color: #EB5D19;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Empty State */
.timeline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: #666;
  background: #fafafa;
  border-radius: 8px;
  border: 1px dashed #ddd;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.timeline-empty p {
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.empty-subtitle {
  font-size: 0.875rem;
  color: #999;
}

/* Error State */
.timeline-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  background: #fff5f5;
  border-radius: 8px;
  border: 1px solid #feb2b2;
  margin-top: 1rem;
}

.timeline-error p {
  color: #c53030;
  margin-bottom: 1rem;
}

.btn-retry {
  padding: 0.5rem 1.5rem;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.2s;
}

.btn-retry:hover {
  background: #c0392b;
}

/* Timeline */
.timeline {
  position: relative;
}

.timeline-item {
  display: flex;
  gap: 1rem;
  margin-bottom: 0;
}

.timeline-item:last-child .marker-line {
  display: none;
}

/* Timeline Marker */
.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.marker-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: white;
  flex-shrink: 0;
}

.marker-icon.status_change {
  background-color: #EB5D19;
}

.marker-icon.worklog {
  background-color: #099268;
}

.marker-line {
  width: 2px;
  flex-grow: 1;
  background: #e0e0e0;
  min-height: 20px;
}

/* Timeline Content */
.timeline-content {
  flex-grow: 1;
  padding-bottom: 1.5rem;
}

.timeline-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  border: 1px solid #eee;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #fafafa;
  border-bottom: 1px solid #eee;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.author {
  font-weight: 600;
  color: #333;
  font-size: 0.9rem;
}

.timestamp {
  font-size: 0.8rem;
  color: #888;
}

/* Work Type Badge */
.work-type-badge {
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Card Body */
.card-body {
  padding: 1rem;
}

/* Status Change */
.status-change .status-label {
  font-size: 0.85rem;
  color: #666;
  display: block;
  margin-bottom: 0.5rem;
}

.status-transition {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.status-badge {
  padding: 0.35rem 0.75rem;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 600;
  color: white;
}

.transition-arrow {
  color: #999;
  font-size: 1.2rem;
}

.change-comment {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #eee;
  font-size: 0.9rem;
  color: #555;
  line-height: 1.5;
}

/* Worklog */
.worklog-body {
  font-size: 0.9rem;
  color: #333;
  line-height: 1.6;
  white-space: pre-wrap;
  margin: 0;
}

.time-spent {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.75rem;
  padding: 0.35rem 0.75rem;
  background: #f0f0f0;
  border-radius: 16px;
  font-size: 0.8rem;
  color: #555;
}

.time-icon {
  font-size: 0.9rem;
}

.internal-badge {
  display: inline-block;
  margin-left: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.2rem 0.5rem;
  background: #ffedcc;
  color: #996600;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}

/* Responsive */
@media (max-width: 640px) {
  .timeline-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .status-transition {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .transition-arrow {
    transform: rotate(90deg);
  }
}
</style>
