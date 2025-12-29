<template>
  <div class="csms-panel">
    <!-- Empty State: No Charger Selected -->
    <div v-if="!chargerId" class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </div>
      <p class="empty-text">{{ t('csms.noChargerSelected') }}</p>
      <p class="empty-subtext">{{ t('csms.selectChargerToView') }}</p>
    </div>

    <!-- Loading State -->
    <div v-else-if="isLoading && !chargerStatus" class="loading-state">
      <div class="spinner"></div>
      <p>{{ t('csms.loadingStatus') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="hasError" class="error-state">
      <div class="error-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p class="error-text">{{ t('csms.unavailable') }}</p>
      <p class="error-subtext">{{ errorMessage }}</p>
      <button @click="refreshData" class="retry-button">
        {{ t('csms.tryAgain') }}
      </button>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Header with Refresh -->
      <div class="panel-header">
        <h3 class="panel-title">{{ t('csms.title') }}</h3>
        <button
          @click="refreshData"
          class="refresh-button"
          :class="{ 'is-refreshing': isLoading }"
          :disabled="isLoading"
          :title="t('csms.refreshStatus')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      <!-- Charger Information Section -->
      <section class="panel-section">
        <h4 class="section-header">{{ t('csms.chargerInformation') }}</h4>

        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">{{ t('csms.name') }}</span>
            <span class="info-value">{{ chargerStatus?.name || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">{{ t('csms.serialNumber') }}</span>
            <span class="info-value">{{ chargerStatus?.serial_number || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">{{ t('csms.vendor') }}</span>
            <span class="info-value">{{ chargerStatus?.vendor || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">{{ t('csms.model') }}</span>
            <span class="info-value">{{ chargerStatus?.model || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">{{ t('csms.firmware') }}</span>
            <span class="info-value firmware">{{ chargerStatus?.firmware_version || '-' }}</span>
          </div>
        </div>
      </section>

      <!-- Operational Status Section -->
      <section class="panel-section">
        <h4 class="section-header">{{ t('csms.operationalStatus') }}</h4>

        <div class="status-display">
          <span
            class="status-indicator"
            :class="statusClass"
          ></span>
          <span class="status-text">{{ formatStatus(chargerStatus?.operational_status) }}</span>
        </div>

        <div class="last-communication">
          <span class="comm-label">{{ t('csms.lastCommunication') }}</span>
          <span class="comm-value">{{ formatTimestamp(chargerStatus?.last_communication) }}</span>
        </div>
      </section>

      <!-- Recent Events Section -->
      <section class="panel-section">
        <h4 class="section-header">{{ t('csms.recentEvents') }}</h4>

        <div v-if="events.length === 0" class="no-events">
          {{ t('csms.noRecentEvents') }}
        </div>

        <div v-else class="events-list">
          <div
            v-for="event in events"
            :key="event.id"
            class="event-item"
            :class="`severity-${event.severity}`"
          >
            <div class="event-header">
              <span class="event-type">{{ event.event_type }}</span>
              <span
                class="severity-badge"
                :class="`severity-${event.severity}`"
              >
                {{ event.severity }}
              </span>
            </div>
            <p class="event-message">{{ event.message || event.details }}</p>
            <span class="event-time">{{ formatTimestamp(event.timestamp) }}</span>
          </div>
        </div>
      </section>

      <!-- Auto-refresh indicator -->
      <div class="auto-refresh-indicator" v-if="autoRefreshEnabled">
        <span class="refresh-dot"></span>
        {{ t('csms.autoRefresh', { seconds: refreshIntervalSeconds }) }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiClient } from '@/services/api'
import type { ChargerStatus, ChargerEvent } from '@/types'
import { useEnumTranslation, useDateTimeFormat } from '@/composables/useI18n'

const { t } = useI18n()
const { translateChargerStatus } = useEnumTranslation()
const { formatRelativeTime } = useDateTimeFormat()

// Props
const props = withDefaults(defineProps<{
  chargerId: string | null | undefined
  refreshInterval?: number
  autoRefresh?: boolean
}>(), {
  refreshInterval: 30000,
  autoRefresh: true
})

// Emits
const emit = defineEmits<{
  (e: 'status-updated', status: ChargerStatus): void
  (e: 'error', error: Error): void
}>()

// State
const chargerStatus = ref<ChargerStatus | null>(null)
const events = ref<ChargerEvent[]>([])
const isLoading = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
let refreshTimer: ReturnType<typeof setInterval> | null = null

// Computed
const autoRefreshEnabled = computed(() => props.autoRefresh && props.chargerId)

const refreshIntervalSeconds = computed(() => Math.round(props.refreshInterval / 1000))

const statusClass = computed(() => {
  const status = chargerStatus.value?.operational_status?.toLowerCase()
  switch (status) {
    case 'available':
      return 'status-available'
    case 'charging':
      return 'status-charging'
    case 'unavailable':
      return 'status-unavailable'
    case 'faulted':
      return 'status-faulted'
    case 'reserved':
      return 'status-reserved'
    default:
      return 'status-unknown'
  }
})

// Methods
function formatStatus(status: string | undefined): string {
  if (!status) return t('common.unknown')
  return translateChargerStatus(status)
}

function formatTimestamp(timestamp: string | null | undefined): string {
  if (!timestamp) return '-'
  return formatRelativeTime(timestamp)
}

async function fetchChargerStatus(): Promise<void> {
  if (!props.chargerId) return

  try {
    const response = await apiClient.getChargerStatus(props.chargerId)
    chargerStatus.value = response
    hasError.value = false
    errorMessage.value = ''
    emit('status-updated', response)
  } catch (error) {
    throw error
  }
}

async function fetchChargerEvents(): Promise<void> {
  if (!props.chargerId) return

  try {
    const response = await apiClient.getChargerEvents(props.chargerId, { limit: 10 })
    events.value = Array.isArray(response) ? response : response.events || []
  } catch (error) {
    // Events fetch failure is non-critical, just log it
    console.warn('Failed to fetch charger events:', error)
    events.value = []
  }
}

async function refreshData(): Promise<void> {
  if (!props.chargerId || isLoading.value) return

  isLoading.value = true
  hasError.value = false

  try {
    await Promise.all([
      fetchChargerStatus(),
      fetchChargerEvents()
    ])
  } catch (error) {
    hasError.value = true
    errorMessage.value = error instanceof Error
      ? error.message
      : 'Unable to connect to CSMS'
    emit('error', error instanceof Error ? error : new Error(String(error)))
  } finally {
    isLoading.value = false
  }
}

function startAutoRefresh(): void {
  stopAutoRefresh()

  if (props.autoRefresh && props.chargerId) {
    refreshTimer = setInterval(() => {
      refreshData()
    }, props.refreshInterval)
  }
}

function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// Watchers
watch(
  () => props.chargerId,
  (newId, oldId) => {
    if (newId !== oldId) {
      // Reset state when charger changes
      chargerStatus.value = null
      events.value = []
      hasError.value = false
      errorMessage.value = ''

      if (newId) {
        refreshData()
        startAutoRefresh()
      } else {
        stopAutoRefresh()
      }
    }
  },
  { immediate: true }
)

watch(
  () => props.autoRefresh,
  (enabled) => {
    if (enabled) {
      startAutoRefresh()
    } else {
      stopAutoRefresh()
    }
  }
)

watch(
  () => props.refreshInterval,
  () => {
    if (props.autoRefresh) {
      startAutoRefresh()
    }
  }
)

// Lifecycle
onMounted(() => {
  if (props.chargerId) {
    refreshData()
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.csms-panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  min-height: 200px;
}

/* Panel Header */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #eee;
}

.panel-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.refresh-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s ease;
}

.refresh-button:hover:not(:disabled) {
  background: #eee;
  color: #333;
}

.refresh-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.refresh-button.is-refreshing svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Section Styles */
.panel-section {
  margin-bottom: 1.5rem;
}

.panel-section:last-of-type {
  margin-bottom: 0;
}

.section-header {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #666;
  margin: 0 0 0.75rem 0;
}

/* Info Grid */
.info-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0;
}

.info-label {
  font-size: 0.875rem;
  color: #888;
}

.info-value {
  font-size: 0.875rem;
  color: #333;
  font-weight: 500;
  text-align: right;
}

.info-value.firmware {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 0.8rem;
  background: #f5f5f5;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

/* Status Display */
.status-display {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f9f9f9;
  border-radius: 6px;
  margin-bottom: 0.75rem;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.status-available {
  background-color: #27ae60;
  box-shadow: 0 0 8px rgba(39, 174, 96, 0.4);
}

.status-indicator.status-charging {
  background-color: #EB5D19;
  box-shadow: 0 0 8px rgba(235, 93, 25, 0.4);
  animation: pulse 2s ease-in-out infinite;
}

.status-indicator.status-unavailable,
.status-indicator.status-faulted {
  background-color: #e74c3c;
  box-shadow: 0 0 8px rgba(231, 76, 60, 0.4);
}

.status-indicator.status-reserved {
  background-color: #f39c12;
  box-shadow: 0 0 8px rgba(243, 156, 18, 0.4);
}

.status-indicator.status-unknown {
  background-color: #95a5a6;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.status-text {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.last-communication {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}

.comm-label {
  color: #888;
}

.comm-value {
  color: #666;
}

/* Events List */
.events-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 300px;
  overflow-y: auto;
}

.event-item {
  padding: 0.75rem;
  background: #fafafa;
  border-radius: 6px;
  border-left: 3px solid #95a5a6;
}

.event-item.severity-info {
  border-left-color: #EB5D19;
}

.event-item.severity-warning {
  border-left-color: #f39c12;
}

.event-item.severity-error {
  border-left-color: #e74c3c;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.375rem;
}

.event-type {
  font-size: 0.8rem;
  font-weight: 600;
  color: #333;
}

.severity-badge {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  color: white;
}

.severity-badge.severity-info {
  background-color: #EB5D19;
}

.severity-badge.severity-warning {
  background-color: #f39c12;
}

.severity-badge.severity-error {
  background-color: #e74c3c;
}

.event-message {
  font-size: 0.8rem;
  color: #555;
  margin: 0 0 0.375rem 0;
  line-height: 1.4;
}

.event-time {
  font-size: 0.7rem;
  color: #999;
}

.no-events {
  text-align: center;
  padding: 1.5rem;
  color: #999;
  font-size: 0.875rem;
}

/* Auto-refresh Indicator */
.auto-refresh-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid #eee;
  font-size: 0.7rem;
  color: #999;
}

.refresh-dot {
  width: 6px;
  height: 6px;
  background: #27ae60;
  border-radius: 50%;
  animation: blink 2s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
}

.empty-icon {
  color: #ccc;
  margin-bottom: 1rem;
}

.empty-text {
  font-size: 1rem;
  font-weight: 600;
  color: #666;
  margin: 0 0 0.25rem 0;
}

.empty-subtext {
  font-size: 0.875rem;
  color: #999;
  margin: 0;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
  color: #666;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #eee;
  border-top-color: #EB5D19;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
}

.error-icon {
  color: #e74c3c;
  margin-bottom: 1rem;
}

.error-text {
  font-size: 1rem;
  font-weight: 600;
  color: #e74c3c;
  margin: 0 0 0.25rem 0;
}

.error-subtext {
  font-size: 0.875rem;
  color: #888;
  margin: 0 0 1rem 0;
}

.retry-button {
  padding: 0.5rem 1rem;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button:hover {
  background: #eee;
  color: #333;
}
</style>
