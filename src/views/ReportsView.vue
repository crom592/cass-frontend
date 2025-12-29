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
          <div class="period-selector">
            <button 
              v-for="p in periods" 
              :key="p.id" 
              :class="['period-btn', { active: currentPeriod === p.id }]"
              @click="currentPeriod = p.id"
            >
              {{ t(`reports.periods.${p.id}`) }}
            </button>
          </div>
          <button class="btn-export" @click="handleExport">
            <span class="icon">📥</span>
            {{ t('reports.exportData') }}
          </button>
        </div>
      </div>

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
              <span :class="['stat-trend', stat.trend >= 0 ? 'up' : 'down']">
                {{ stat.trend >= 0 ? '+' : '' }}{{ stat.trend }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="reports-grid">
        <!-- Ticket Trends Chart Placeholder -->
        <div class="report-card chart-card">
          <div class="card-header">
            <h3>{{ t('reports.charts.ticketTrends') }}</h3>
            <span class="chart-info">Last 30 days</span>
          </div>
          <div class="chart-container">
            <!-- Simple CSS-based bar chart mock -->
            <div class="bar-chart">
              <div v-for="(val, i) in trendData" :key="i" class="bar-wrapper">
                <div class="bar" :style="{ height: val + '%', backgroundColor: i % 2 === 0 ? '#EB5D19' : '#ffebd6' }">
                  <span class="tooltip">{{ val }}</span>
                </div>
                <span class="bar-label">{{ 12 + i }}</span>
              </div>
            </div>
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
                <button class="btn-view">{{ t('common.view') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Navbar from '@/components/Navbar.vue'

const { t } = useI18n()

const currentPeriod = ref('daily')
const periods = [
  { id: 'daily' },
  { id: 'weekly' },
  { id: 'monthly' }
]

const stats = ref([
  { key: 'totalTickets', value: '156', trend: 12, icon: '🎫', color: '#EB5D19' },
  { key: 'resolvedCount', value: '124', trend: 8, icon: '✅', color: '#27ae60' },
  { key: 'slaBreachRate', value: '4.5%', trend: -2, icon: '⚠️', color: '#e74c3c' },
  { key: 'avgResolutionTime', value: '2.4h', trend: -15, icon: '⏱️', color: '#3498db' }
])

const trendData = ref([45, 60, 55, 75, 85, 70, 95, 80, 65, 50, 40, 55])

const categoryDist = ref([
  { name: 'hardware', count: 45, percentage: 35 },
  { name: 'software', count: 32, percentage: 25 },
  { name: 'network', count: 28, percentage: 22 },
  { name: 'other', count: 23, percentage: 18 }
])

const priorityDist = ref([
  { name: 'critical', count: 12, percentage: 10 },
  { name: 'high', count: 35, percentage: 28 },
  { name: 'medium', count: 58, percentage: 46 },
  { name: 'low', count: 21, percentage: 16 }
])

const recentReports = ref([
  { date: '2025-12-29', total: 18, resolved: 15, breached: 1, avgTime: 145 },
  { date: '2025-12-28', total: 22, resolved: 20, breached: 0, avgTime: 112 },
  { date: '2025-12-27', total: 15, resolved: 12, breached: 2, avgTime: 198 },
  { date: '2025-12-26', total: 25, resolved: 23, breached: 0, avgTime: 105 },
  { date: '2025-12-25', total: 12, resolved: 10, breached: 1, avgTime: 156 }
])

function getPriorityColor(priority: string) {
  const colors: Record<string, string> = {
    critical: '#e74c3c',
    high: '#e67e22',
    medium: '#f1c40f',
    low: '#27ae60'
  }
  return colors[priority] || '#95a5a6'
}

function handleExport() {
  // TODO: Call API export
  console.log('Exporting report...')
}

onMounted(() => {
  // TODO: Fetch real data from API
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

.period-selector {
  display: flex;
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

.btn-export {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

/* Stats Grid */
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

/* Reports Layout */
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

/* Custom CSS Chart Mock */
.chart-container {
  flex-grow: 1;
  display: flex;
  align-items: flex-end;
  min-height: 200px;
  padding-bottom: 1rem;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  width: 100%;
  height: 100%;
  gap: 0.5rem;
}

.bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.bar {
  width: 100%;
  min-width: 10px;
  border-radius: 4px 4px 0 0;
  position: relative;
  transition: all 0.3s;
}

.bar:hover {
  filter: brightness(1.1);
  cursor: pointer;
}

.tooltip {
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.bar:hover .tooltip { opacity: 1; }

.bar-label {
  font-size: 0.7rem;
  color: #999;
  font-weight: 600;
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
}

/* Table Card */
.table-card {
  margin-top: 1.5rem;
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
