<template>
  <div class="reports-page">
    <Navbar />
    
    <div class="content-container">
      <div class="page-header">
        <div class="header-left">
          <h1>{{ t('reports.title') }}</h1>
          <p class="subtitle">{{ t('reports.subtitle') }}</p>
        </div>
        <div class="header-actions">
          <button 
            @click="toggleAutoRefresh" 
            :class="['btn-refresh', { active: autoRefreshEnabled }]"
            :title="autoRefreshEnabled ? t('reports.autoRefresh.enabled') : t('reports.autoRefresh.disabled')"
          >
            {{ autoRefreshEnabled ? '🔄' : '⏸️' }} {{ t('common.refresh') }}
          </button>
          <div class="export-dropdown">
            <button class="btn-export" @click="showExportMenu = !showExportMenu">
              {{ t('reports.exportData') }} ▼
            </button>
            <div v-if="showExportMenu" class="export-menu">
              <button @click="handleExport('csv')">{{ t('reports.export.csv') }}</button>
              <button @click="handleExport('xlsx')">{{ t('reports.export.xlsx') }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Date Range Picker -->
      <DateRangePicker
        v-model:start-date="dateRange.start"
        v-model:end-date="dateRange.end"
        @change="fetchReportData"
      />

      <!-- Period Selector -->
      <div class="period-selector-wrapper">
        <div class="period-selector">
          <button 
            v-for="p in periods" 
            :key="p.id" 
            :class="['period-btn', { active: currentPeriod === p.id }]"
            @click="selectPeriod(p.id)"
          >
            {{ t(`reports.periods.${p.id}`) }}
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
        <button @click="fetchReportData" class="btn-retry">{{ t('common.refresh') }}</button>
      </div>

      <!-- Report Content -->
      <template v-else>
        <!-- Stats Grid -->
        <div class="stats-grid">
          <div class="stat-card" v-for="stat in stats" :key="stat.key">
            <div class="stat-icon" :style="{ backgroundColor: stat.color + '15', color: stat.color }">
              {{ stat.icon }}
            </div>
            <div class="stat-info">
              <span class="stat-label">{{ t(`reports.stats.${stat.key}`) }}</span>
              <div class="stat-value-container">
                <span class="stat-value">{{ stat.value }}</span>
                <span v-if="stat.trend !== undefined" :class="['stat-trend', stat.trend >= 0 ? 'up' : 'down']">
                  {{ stat.trend >= 0 ? '+' : '' }}{{ stat.trend }}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="reports-grid">
          <!-- Ticket Trends Chart -->
          <div class="report-card chart-card">
            <div class="card-header">
              <h3>{{ t('reports.charts.ticketTrends') }}</h3>
              <span class="chart-info">{{ dateRange.start }} ~ {{ dateRange.end }}</span>
            </div>
            <div class="chart-container">
              <Line :data="chartData" :options="chartOptions" />
            </div>
          </div>

          <!-- Distribution Charts -->
          <div class="side-reports">
            <!-- Category Distribution -->
            <div class="report-card dist-card">
              <h3>{{ t('reports.charts.byCategory') }}</h3>
              <div class="dist-list">
                <div v-for="cat in categoryDist" :key="cat.name" class="dist-item">
                  <div class="dist-info">
                    <span class="dist-name">{{ t(`category.${cat.name}`) }}</span>
                    <span class="dist-count">{{ cat.count }}</span>
                  </div>
                  <div class="progress-bg">
                    <div class="progress-fill" :style="{ width: cat.percentage + '%', backgroundColor: '#EB5D19' }"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Priority Distribution -->
            <div class="report-card dist-card">
              <h3>{{ t('reports.charts.byPriority') }}</h3>
              <div class="dist-list">
                <div v-for="pri in priorityDist" :key="pri.name" class="dist-item">
                  <div class="dist-info">
                    <span class="dist-name">{{ t(`priority.${pri.name}`) }}</span>
                    <span class="dist-count">{{ pri.count }}</span>
                  </div>
                  <div class="progress-bg">
                    <div class="progress-fill" :style="{ width: pri.percentage + '%', backgroundColor: getPriorityColor(pri.name) }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Snapshot Table -->
        <div class="report-card table-card">
          <div class="card-header">
            <h3>{{ t('reports.recentSnapshots') }}</h3>
          </div>
          <div class="table-wrapper">
            <table class="report-table">
              <thead>
                <tr>
                  <th>{{ t('reports.table.date') }}</th>
                  <th>{{ t('reports.table.totalTickets') }}</th>
                  <th>{{ t('reports.table.resolved') }}</th>
                  <th>{{ t('reports.table.slaBreached') }}</th>
                  <th>{{ t('reports.table.avgResolution') }}</th>
                  <th>{{ t('reports.table.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in recentReports" :key="row.date">
                  <td class="date-cell">{{ row.date }}</td>
                  <td>{{ row.total }}</td>
                  <td><span class="resolved-count">{{ row.resolved }}</span></td>
                  <td><span :class="['breached-count', { warning: row.breached > 0 }]">{{ row.breached }}</span></td>
                  <td>{{ row.avgTime }}m</td>
                  <td>
                    <button class="btn-view" @click="viewSnapshot(row)">{{ t('common.view') }}</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { toast } from 'vue3-toastify'
import * as XLSX from 'xlsx'
import Navbar from '@/components/Navbar.vue'
import DateRangePicker from '@/components/DateRangePicker.vue'
import { apiClient } from '@/services/api'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const { t } = useI18n()
const router = useRouter()

const loading = ref(false)
const error = ref(false)
const autoRefreshEnabled = ref(false)
const showExportMenu = ref(false)
let refreshInterval: number | null = null

const currentPeriod = ref('daily')
const periods = [
  { id: 'daily' },
  { id: 'weekly' },
  { id: 'monthly' }
]

const dateRange = ref({
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
})

const stats = ref([
  { key: 'totalTickets', value: '0', trend: 0, icon: 'T', color: '#EB5D19' },
  { key: 'resolvedCount', value: '0', trend: 0, icon: 'R', color: '#27ae60' },
  { key: 'slaBreachRate', value: '0%', trend: 0, icon: 'S', color: '#e74c3c' },
  { key: 'avgResolutionTime', value: '0h', trend: 0, icon: 'A', color: '#3498db' }
])

const trendData = ref<number[]>([])
const trendLabels = ref<string[]>([])
const categoryDist = ref<any[]>([])
const priorityDist = ref<any[]>([])
const recentReports = ref<any[]>([])

const chartData = computed(() => ({
  labels: trendLabels.value,
  datasets: [
    {
      label: t('reports.charts.ticketTrends'),
      data: trendData.value,
      borderColor: '#EB5D19',
      backgroundColor: 'rgba(235, 93, 25, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6
    }
  ]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      titleFont: {
        size: 14,
        family: 'Pretendard'
      },
      bodyFont: {
        size: 13,
        family: 'Pretendard'
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        font: {
          family: 'Pretendard'
        }
      }
    },
    x: {
      ticks: {
        font: {
          family: 'Pretendard'
        }
      }
    }
  }
}))

function selectPeriod(periodId: string) {
  currentPeriod.value = periodId
  const now = new Date()
  let startDate = new Date()

  switch (periodId) {
    case 'daily':
      startDate.setDate(now.getDate() - 7)
      break
    case 'weekly':
      startDate.setDate(now.getDate() - 30)
      break
    case 'monthly':
      startDate.setMonth(now.getMonth() - 3)
      break
  }

  dateRange.value = {
    start: startDate.toISOString().split('T')[0],
    end: now.toISOString().split('T')[0]
  }

  fetchReportData()
}

async function fetchReportData() {
  loading.value = true
  error.value = false

  try {
    const params = {
      start_date: dateRange.value.start,
      end_date: dateRange.value.end,
      period: currentPeriod.value
    }

    // Fetch all report data in parallel
    const [statsData, trendsData, distributionData, snapshotsData] = await Promise.all([
      apiClient.getReportStats(params).catch(() => null),
      apiClient.getReportTrends(params).catch(() => null),
      apiClient.getReportDistribution(params).catch(() => null),
      apiClient.getRecentSnapshots({ limit: 10 }).catch(() => null)
    ])

    // Update stats
    if (statsData) {
      stats.value = [
        { key: 'totalTickets', value: statsData.total_tickets?.toString() || '0', trend: statsData.total_trend || 0, icon: 'T', color: '#EB5D19' },
        { key: 'resolvedCount', value: statsData.resolved_count?.toString() || '0', trend: statsData.resolved_trend || 0, icon: 'R', color: '#27ae60' },
        { key: 'slaBreachRate', value: `${statsData.sla_breach_rate || 0}%`, trend: statsData.sla_trend || 0, icon: 'S', color: '#e74c3c' },
        { key: 'avgResolutionTime', value: `${statsData.avg_resolution_time || 0}h`, trend: statsData.time_trend || 0, icon: 'A', color: '#3498db' }
      ]
    }

    // Update trends
    if (trendsData) {
      trendLabels.value = trendsData.labels || []
      trendData.value = trendsData.values || []
    }

    // Update distributions
    if (distributionData) {
      categoryDist.value = distributionData.by_category || []
      priorityDist.value = distributionData.by_priority || []
    }

    // Update snapshots
    if (snapshotsData) {
      recentReports.value = snapshotsData.snapshots || []
    }

  } catch (err: any) {
    console.error('Failed to fetch report data:', err)
    error.value = true
    toast.error(t('reports.error'))
  } finally {
    loading.value = false
  }
}

function toggleAutoRefresh() {
  autoRefreshEnabled.value = !autoRefreshEnabled.value
  
  if (autoRefreshEnabled.value) {
    refreshInterval = window.setInterval(() => {
      fetchReportData()
    }, 30000) // 30 seconds
    toast.success(t('reports.autoRefresh.enabled'))
  } else {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
    toast.info(t('reports.autoRefresh.disabled'))
  }
}

async function handleExport(format: 'csv' | 'xlsx') {
  showExportMenu.value = false
  
  try {
    toast.info(t('reports.export.downloading'))
    
    const params = {
      start_date: dateRange.value.start,
      end_date: dateRange.value.end,
      period: currentPeriod.value
    }

    if (format === 'csv') {
      // Export as CSV
      const blob = await apiClient.exportReportData(params, 'csv')
      downloadBlob(blob, `report_${dateRange.value.start}_${dateRange.value.end}.csv`)
    } else {
      // Export as Excel using local data
      const wb = XLSX.utils.book_new()
      
      // Stats sheet
      const statsSheet = XLSX.utils.json_to_sheet(stats.value.map(s => ({
        Metric: t(`reports.stats.${s.key}`),
        Value: s.value,
        Trend: `${s.trend}%`
      })))
      XLSX.utils.book_append_sheet(wb, statsSheet, 'Statistics')
      
      // Snapshots sheet
      const snapshotsSheet = XLSX.utils.json_to_sheet(recentReports.value.map(r => ({
        Date: r.date,
        Total: r.total,
        Resolved: r.resolved,
        'SLA Breached': r.breached,
        'Avg Time (min)': r.avgTime
      })))
      XLSX.utils.book_append_sheet(wb, snapshotsSheet, 'Snapshots')
      
      XLSX.writeFile(wb, `report_${dateRange.value.start}_${dateRange.value.end}.xlsx`)
    }
    
    toast.success(t('reports.export.success'))
  } catch (err) {
    console.error('Export failed:', err)
    toast.error(t('reports.export.error'))
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

function viewSnapshot(row: any) {
  router.push(`/reports/snapshot/${row.date}`)
}

function getPriorityColor(priority: string) {
  const colors: Record<string, string> = {
    critical: '#e74c3c',
    high: '#e67e22',
    medium: '#f1c40f',
    low: '#27ae60'
  }
  return colors[priority] || '#95a5a6'
}

onMounted(() => {
  fetchReportData()
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.reports-page {
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
  align-items: flex-end;
  margin-bottom: 2rem;
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

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.btn-refresh {
  padding: 0.6rem 1.25rem;
  background-color: white;
  color: #6c757d;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh.active {
  background-color: #27ae60;
  color: white;
  border-color: #27ae60;
}

.btn-refresh:hover {
  transform: translateY(-1px);
}

.export-dropdown {
  position: relative;
}

.btn-export {
  padding: 0.6rem 1.25rem;
  background-color: white;
  color: #EB5D19;
  border: 1px solid #EB5D19;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export:hover {
  background-color: #fff5f0;
  transform: translateY(-1px);
}

.export-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 10;
  min-width: 180px;
}

.export-menu button {
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  text-align: left;
  font-size: 0.9rem;
  font-weight: 600;
  color: #495057;
  cursor: pointer;
  transition: background-color 0.2s;
}

.export-menu button:hover {
  background-color: #f8f9fa;
}

.export-menu button:first-child {
  border-radius: 8px 8px 0 0;
}

.export-menu button:last-child {
  border-radius: 0 0 8px 8px;
}

.period-selector-wrapper {
  margin-bottom: 2rem;
}

.period-selector {
  display: inline-flex;
  background: #eee;
  padding: 0.25rem;
  border-radius: 8px;
  gap: 0.25rem;
}

.period-btn {
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: #666;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.period-btn.active {
  background: white;
  color: #EB5D19;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.03);
  border: 1px solid #eee;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
}

.stat-label {
  display: block;
  font-size: 0.85rem;
  color: #6c757d;
  margin-bottom: 0.25rem;
  font-weight: 600;
}

.stat-value-container {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: #212529;
}

.stat-trend {
  font-size: 0.75rem;
  font-weight: 700;
}

.stat-trend.up { color: #27ae60; }
.stat-trend.down { color: #e74c3c; }

.reports-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
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

.chart-card {
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.card-header h3 { margin-bottom: 0; }

.chart-info {
  font-size: 0.75rem;
  color: #999;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chart-container {
  flex-grow: 1;
  min-height: 300px;
  position: relative;
}

.side-reports {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dist-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dist-item {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.dist-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  font-weight: 600;
}

.dist-name { color: #495057; }
.dist-count { color: #868e96; }

.progress-bg {
  height: 6px;
  background: #f1f3f5;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.table-card {
  margin-top: 1.5rem;
}

.table-wrapper {
  overflow-x: auto;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
}

.report-table th {
  text-align: left;
  padding: 1rem;
  font-size: 0.75rem;
  color: #adb5bd;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 1px solid #f1f3f5;
  font-weight: 700;
}

.report-table td {
  padding: 1rem;
  font-size: 0.9rem;
  border-bottom: 1px solid #f1f3f5;
  color: #495057;
}

.date-cell { font-weight: 700; color: #212529 !important; }

.resolved-count { color: #27ae60; font-weight: 700; }
.breached-count { font-weight: 700; }
.breached-count.warning { color: #e74c3c; }

.btn-view {
  padding: 0.4rem 0.8rem;
  background: transparent;
  color: #EB5D19;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-view:hover {
  background: #fff5f0;
  border-color: #EB5D19;
}

@media (max-width: 992px) {
  .reports-grid {
    grid-template-columns: 1fr;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1.5rem;
  }
  
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 600px) {
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .period-selector {
    justify-content: center;
  }
  
  .stat-card {
    padding: 1rem;
  }
}
</style>
