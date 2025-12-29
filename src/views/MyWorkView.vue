<template>
  <div class="my-work-page">
    <Navbar />
    <div class="container">
      <div class="page-header">
        <h1>{{ t('myWork.title') }}</h1>
        <p class="subtitle">{{ t('myWork.subtitle') }}</p>
      </div>

      <div class="card placeholder-card">
        <div class="placeholder-icon">{{ t('myWork.icon') }}</div>
        <h3>{{ t('myWork.underDevelopment') }}</h3>
        <p>{{ t('myWork.description') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Navbar from '@/components/Navbar.vue'

const { t } = useI18n()
</script>

<style scoped>
.my-work-page {
  min-height: 100vh;
  background-color: #f8f9fa;
}

.page-header {
  margin-bottom: 2rem;
}

h1 {
  color: #212529;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #6c757d;
  font-size: 1rem;
}

.placeholder-card {
  text-align: center;
  padding: 4rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.placeholder-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.placeholder-card h3 {
  color: #EB5D19;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.placeholder-card p {
  color: #6c757d;
  max-width: 400px;
}
</style>
