<template>
  <div class="snapshot-page">
    <Navbar />
    
    <div class="content-container">
      <div class="page-header">
        <div class="header-left">
          <button @click="goBack" class="btn-back">← {{ t('common.back') }}</button>
          <div>
            <h1>{{ t('reports.recentSnapshots') }}</h1>
            <p class="subtitle">{{ snapshotDate }}</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-export" @click="handleExport">
            {{ t('reports.exportData') }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>{{ t('reports.loading') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <p>{{ t('reports.error') }}</p>
        <button @click="fetchSnapshot" class="btn-retry">{{ t('common.refresh') }}</button>
      </div>

      <!-- Snapshot Content -->
      <template v-else-if="snapshot">
        <!-- Summary Cards -->
        <div class="summary-grid">
          <div class="summary-card">
            <h3>{{ t('reports.stats.totalTickets') }}</h3>
            <div class="summary-value">{{ snapshot.total_tickets || 0 }}</div>
          </div>
          <div class="summary-card">
            <h3>{{ t('reports.stats.resolvedCount') }}</h3>
            <div class="summary-value resolved">{{ snapshot.resolved_count || 0 }}</div>
          </div>
          <div class="summary-card">
            <h3>{{ t('reports.table.slaBreached') }}</h3>
            <div class="summary-value breached">{{ snapshot.sla_breached || 0 }}</div>
          </div>
          <div class="summary-card">
            <h3>{{ t('reports.stats.avgResolutionTime') }}</h3>
            <div class="summary-value">{{ snapshot.avg_resolution_time || 0 }}m</div>
          </div>
        </div>

        <!-- Detailed Breakdown -->
        <div class="breakdown-grid">
          <!-- By Status -->
          <div class="report-card">
            <h3>Tickets by Status</h3>
            <div class="breakdown-list">
              <div v-for="item in snapshot.by_status" :key="item.status" class="breakdown-item">
                <span class="breakdown-label">{{ item.status }}</span>
                <span class="breakdown-value">{{ item.count }}</span>
              </div>
            </div>
          </div>

          <!-- By Category -->
          <div class="report-card">
            <h3>{{ t('reports.charts.byCategory') }}</h3>
            <div class="breakdown-list">
              <div v-for="item in snapshot.by_category" :key="item.category" class="breakdown-item">
                <span class="breakdown-label">{{ t(`category.${item.category}`) }}</span>
                <span class="breakdown-value">{{ item.count }}</span>
              </div>
            </div>
          </div>

          <!-- By Priority -->
          <div class="report-card">
            <h3>{{ t('reports.charts.byPriority') }}</h3>
            <div class="breakdown-list">
              <div v-for="item in snapshot.by_priority" :key="item.priority" class="breakdown-item">
                <span class="breakdown-label">{{ t(`priority.${item.priority}`) }}</span>
                <span class="breakdown-value">{{ item.count }}</span>
              </div>
            </div>
          </div>

          <!-- By Engineer -->
          <div class="report-card">
            <h3>Tickets by Engineer</h3>
            <div class="breakdown-list">
              <div v-for="item in snapshot.by_engineer" :key="item.engineer" class="breakdown-item">
                <span class="breakdown-label">{{ item.engineer }}</span>
                <span class="breakdown-value">{{ item.count }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Performance Metrics -->
        <div class="report-card metrics-card">
          <h3>Performance Metrics</h3>
          <div class="metrics-grid">
            <div class="metric-item">
              <span class="metric-label">First Response Time</span>
              <span class="metric-value">{{ snapshot.first_response_time || 0 }}m</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Resolution Rate</span>
              <span class="metric-value">{{ snapshot.resolution_rate || 0 }}%</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">SLA Compliance</span>
              <span class="metric-value">{{ snapshot.sla_compliance || 0 }}%</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Customer Satisfaction</span>
              <span class="metric-value">{{ snapshot.csat_score || 0 }}/5</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { toast } from 'vue3-toastify'
import * as XLSX from 'xlsx'
import Navbar from '@/components/Navbar.vue'
import { apiClient } from '@/services/api'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const loading = ref(false)
const error = ref(false)
const snapshot = ref<any>(null)
const snapshotDate = ref('')

async function fetchSnapshot() {
  loading.value = true
  error.value = false

  try {
    const id = route.params.id as string
    
    const data = await apiClient.getReportSnapshot(id)
    
    // Parse snapshot data
    if (data.parsed_metrics) {
      snapshotDate.value = data.period_start
      snapshot.value = {
        total_tickets: data.parsed_metrics.total_created,
        resolved_count: data.parsed_metrics.total_resolved,
        sla_breached: data.parsed_metrics.sla_breached_count,
        avg_resolution_time: data.parsed_metrics.avg_resolution_time_hours * 60, // Convert to minutes
        by_status: Object.entries(data.parsed_metrics.by_status || {}).map(([status, count]) => ({ status, count })),
        by_category: Object.entries(data.parsed_metrics.by_category || {}).map(([category, count]) => ({ category, count })),
        by_priority: Object.entries(data.parsed_metrics.by_priority || {}).map(([priority, count]) => ({ priority, count })),
        by_engineer: data.parsed_metrics.top_sites?.map((site: any) => ({ engineer: site.site_name, count: site.ticket_count })) || [],
        first_response_time: 0,
        resolution_rate: data.parsed_metrics.total_created > 0 ? (data.parsed_metrics.total_resolved / data.parsed_metrics.total_created * 100).toFixed(1) : 0,
        sla_compliance: (data.parsed_metrics.sla_compliance_rate * 100).toFixed(1),
        csat_score: 0
      }
    } else {
      snapshot.value = data
      snapshotDate.value = data.period_start
    }
  } catch (err: any) {
    console.error('Failed to fetch snapshot:', err)
    error.value = true
    toast.error(t('reports.error'))
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/reports')
}

function handleExport() {
  if (!snapshot.value) return

  try {
    const wb = XLSX.utils.book_new()
    
    // Summary sheet
    const summaryData = [
      { Metric: t('reports.stats.totalTickets'), Value: snapshot.value.total_tickets },
      { Metric: t('reports.stats.resolvedCount'), Value: snapshot.value.resolved_count },
      { Metric: t('reports.table.slaBreached'), Value: snapshot.value.sla_breached },
      { Metric: t('reports.stats.avgResolutionTime'), Value: `${snapshot.value.avg_resolution_time}m` }
    ]
    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')
    
    // By Status
    if (snapshot.value.by_status) {
      const statusSheet = XLSX.utils.json_to_sheet(snapshot.value.by_status)
      XLSX.utils.book_append_sheet(wb, statusSheet, 'By Status')
    }
    
    // By Category
    if (snapshot.value.by_category) {
      const categorySheet = XLSX.utils.json_to_sheet(snapshot.value.by_category)
      XLSX.utils.book_append_sheet(wb, categorySheet, 'By Category')
    }
    
    // By Priority
    if (snapshot.value.by_priority) {
      const prioritySheet = XLSX.utils.json_to_sheet(snapshot.value.by_priority)
      XLSX.utils.book_append_sheet(wb, prioritySheet, 'By Priority')
    }
    
    XLSX.writeFile(wb, `snapshot_${snapshotDate.value}.xlsx`)
    toast.success(t('reports.export.success'))
  } catch (err) {
    console.error('Export failed:', err)
    toast.error(t('reports.export.error'))
  }
}

onMounted(() => {
  fetchSnapshot()
})
</script>

<style scoped>
.snapshot-page {
  min-height: 100vh;
  background-color: #f8f9fa;
}

.content-container {
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

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.btn-back {
  padding: 0.6rem 1rem;
  background-color: white;
  color: #495057;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background-color: #f8f9fa;
  transform: translateX(-2px);
}

h1 {
  font-size: 1.75rem;
  color: #212529;
  margin: 0 0 0.25rem 0;
  font-weight: 800;
}

.subtitle {
  color: #6c757d;
  font-size: 0.95rem;
  margin: 0;
}

.btn-export {
  padding: 0.6rem 1.25rem;
  background-color: #EB5D19;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export:hover {
  background-color: #d14d12;
  transform: translateY(-1px);
}

.loading-state,
.error-state {
  text-align: center;
  padding: 4rem 2rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #EB5D19;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.btn-retry {
  margin-top: 1rem;
  padding: 0.6rem 1.5rem;
  background-color: #EB5D19;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.summary-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.03);
  border: 1px solid #eee;
  text-align: center;
}

.summary-card h3 {
  font-size: 0.9rem;
  color: #6c757d;
  margin: 0 0 1rem 0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-value {
  font-size: 2.5rem;
  font-weight: 800;
  color: #212529;
}

.summary-value.resolved {
  color: #27ae60;
}

.summary-value.breached {
  color: #e74c3c;
}

.breakdown-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.report-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.03);
  border: 1px solid #eee;
}

.report-card h3 {
  margin: 0 0 1.25rem 0;
  font-size: 1.1rem;
  color: #212529;
  font-weight: 700;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.breakdown-label {
  font-size: 0.9rem;
  color: #495057;
  font-weight: 600;
}

.breakdown-value {
  font-size: 1.1rem;
  color: #212529;
  font-weight: 700;
}

.metrics-card {
  margin-top: 1.5rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.metric-label {
  font-size: 0.85rem;
  color: #6c757d;
  font-weight: 600;
}

.metric-value {
  font-size: 1.5rem;
  color: #212529;
  font-weight: 800;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .summary-grid,
  .breakdown-grid {
    grid-template-columns: 1fr;
  }
}
</style>
