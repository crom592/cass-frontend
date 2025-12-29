<template>
  <nav class="navbar">
    <div class="nav-container">
      <div class="nav-brand">
        <router-link to="/">{{ t('common.appName') }}</router-link>
      </div>

      <div class="nav-links">
        <router-link to="/">{{ t('nav.dashboard') }}</router-link>
        <router-link to="/tickets">{{ t('nav.tickets') }}</router-link>
        <router-link to="/reports" v-if="canViewReports">{{ t('nav.reports') }}</router-link>
        <router-link to="/my-work" v-if="isEngineer">{{ t('nav.myWork') }}</router-link>
      </div>

      <div class="nav-user">
        <LanguageSwitcher />
        <span class="user-name">{{ authStore.user?.full_name || 'User' }}</span>
        <button @click="handleLogout" class="btn-logout">{{ t('nav.logout') }}</button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const canViewReports = computed(() => {
  const role = authStore.userRole
  return role === 'admin' || role === 'tenant_admin' || role === 'as_manager'
})

const isEngineer = computed(() => {
  return authStore.userRole === 'as_engineer'
})

function handleLogout() {
  authStore.logout()
  router.push({ name: 'login' })
}
</script>

<style scoped>
.navbar {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1rem 0;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand a {
  font-size: 1.5rem;
  font-weight: 800;
  color: #EB5D19;
  text-decoration: none;
  letter-spacing: -0.5px;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-links a {
  color: #495057;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  color: #EB5D19;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.user-name {
  color: #495057;
  font-size: 0.9rem;
  font-weight: 500;
}

.btn-logout {
  padding: 0.5rem 1rem;
  background-color: transparent;
  color: #adb5bd;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-logout:hover {
  background-color: #f1f3f5;
  color: #e03131;
  border-color: #ffa8a8;
}
</style>
