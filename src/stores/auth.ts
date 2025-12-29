import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '@/services/api'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('access_token'))

  const isAuthenticated = computed(() => !!token.value)
  const userRole = computed(() => user.value?.role || null)

  async function login(email: string, password: string) {
    const response = await apiClient.login(email, password)
    token.value = response.access_token
    localStorage.setItem('access_token', response.access_token)

    // Fetch user profile
    await fetchUser()
  }

  async function fetchUser() {
    if (!token.value) return

    try {
      user.value = await apiClient.getMe()
    } catch (error) {
      // If fetching user fails, clear auth
      logout()
      throw error
    }
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('access_token')
  }

  // Initialize: fetch user if token exists
  if (token.value) {
    fetchUser()
  }

  return {
    user,
    token,
    isAuthenticated,
    userRole,
    login,
    logout,
    fetchUser,
  }
})
