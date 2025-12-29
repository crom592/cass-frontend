<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <LanguageSwitcher class="login-lang-switcher" />
      </div>
      <h1>{{ t('common.appName') }}</h1>
      <p class="subtitle">{{ t('common.appFullName') }}</p>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">{{ t('auth.email') }}</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            :placeholder="t('auth.enterEmail')"
          />
        </div>

        <div class="form-group">
          <label for="password">{{ t('auth.password') }}</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            :placeholder="t('auth.enterPassword')"
          />
        </div>

        <button type="submit" :disabled="loading" class="btn-primary">
          {{ loading ? t('auth.loggingIn') : t('auth.login') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'vue3-toastify'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  loading.value = true

  try {
    await authStore.login(email.value, password.value)
    toast.success(t('auth.loginSuccess'))
    router.push({ name: 'dashboard' })
  } catch (error) {
    toast.error(t('auth.loginFailed'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f8f9fa;
}

.login-card {
  background: white;
  padding: 3rem;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
  width: 100%;
  max-width: 400px;
  border: 1px solid #dee2e6;
}

h1 {
  font-size: 2.5rem;
  color: #EB5D19;
  margin-bottom: 0.5rem;
  text-align: center;
  font-weight: 800;
  letter-spacing: -1px;
}

.subtitle {
  text-align: center;
  color: #495057;
  margin-bottom: 2rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #212529;
  font-weight: 600;
  font-size: 0.9rem;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.2s;
  background-color: #fff;
}

input:focus {
  outline: none;
  border-color: #EB5D19;
  box-shadow: 0 0 0 3px rgba(235, 93, 25, 0.1);
}

.btn-primary {
  width: 100%;
  padding: 0.85rem;
  background-color: #EB5D19;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background-color: #d14d12;
  transform: translateY(-1px);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.login-lang-switcher {
  margin-right: -0.5rem;
}
</style>
