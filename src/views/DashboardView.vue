<template>
  <div class="dashboard">
    <Navbar />

    <div class="content">
      <h1>{{ t('dashboard.title') }}</h1>

      <div class="stats-grid">
        <div class="stat-card">
          <h3>{{ t('dashboard.totalTickets') }}</h3>
          <p class="stat-number">{{ formatNumber(stats.total) }}</p>
        </div>

        <div class="stat-card critical">
          <h3>{{ t('dashboard.critical') }}</h3>
          <p class="stat-number">{{ formatNumber(stats.critical) }}</p>
        </div>

        <div class="stat-card warning">
          <h3>{{ t('dashboard.slaBreached') }}</h3>
          <p class="stat-number">{{ formatNumber(stats.breached) }}</p>
        </div>

        <div class="stat-card success">
          <h3>{{ t('dashboard.resolvedToday') }}</h3>
          <p class="stat-number">{{ formatNumber(stats.resolved) }}</p>
        </div>
      </div>

      <div class="quick-actions">
        <router-link to="/tickets/new" class="btn-primary">
          {{ t('dashboard.newTicket') }}
        </router-link>
        <router-link to="/tickets" class="btn-secondary">
          {{ t('dashboard.viewAllTickets') }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Navbar from '@/components/Navbar.vue'
import { useNumberFormat } from '@/composables/useI18n'

const { t } = useI18n()
const { formatNumber } = useNumberFormat()

const stats = ref({
  total: 0,
  critical: 0,
  breached: 0,
  resolved: 0,
})

onMounted(() => {
  // TODO: Fetch dashboard stats from API
  stats.value = {
    total: 156,
    critical: 8,
    breached: 12,
    resolved: 23,
  }
})
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  margin-bottom: 2rem;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  border-left: 4px solid #EB5D19;
  border-top: 1px solid #dee2e6;
  border-right: 1px solid #dee2e6;
  border-bottom: 1px solid #dee2e6;
}

.stat-card.critical {
  border-left-color: #e03131;
}

.stat-card.warning {
  border-left-color: #f08c00;
}

.stat-card.success {
  border-left-color: #099268;
}

.stat-card h3 {
  font-size: 0.85rem;
  color: #868e96;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 800;
  color: #212529;
}

.quick-actions {
  display: flex;
  gap: 1rem;
}

.btn-primary {
  background-color: #EB5D19;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 700;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.btn-secondary {
  background-color: white;
  color: #EB5D19;
  border: 2px solid #EB5D19;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 700;
  transition: all 0.2s;
  cursor: pointer;
}

.btn-primary:hover {
  background-color: #d14d12;
  transform: translateY(-1px);
}

.btn-secondary:hover {
  background-color: #fff5f0;
  transform: translateY(-1px);
}
</style>
