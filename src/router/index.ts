import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/tickets',
      name: 'tickets',
      component: () => import('@/views/TicketListView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/tickets/new',
      name: 'ticket-create',
      component: () => import('@/views/TicketCreateView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/tickets/:id',
      name: 'ticket-detail',
      component: () => import('@/views/TicketDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/my-work',
      name: 'my-work',
      component: () => import('@/views/MyWorkView.vue'),
      meta: { requiresAuth: true, roles: ['as_engineer'] },
    },
    {
      path: '/reports',
      name: 'reports',
      component: () => import('@/views/ReportsView.vue'),
      meta: { requiresAuth: true, roles: ['admin', 'tenant_admin', 'as_manager'] },
    },
    {
      path: '/reports/snapshot/:id',
      name: 'report-snapshot',
      component: () => import('@/views/ReportSnapshotView.vue'),
      meta: { requiresAuth: true, roles: ['admin', 'tenant_admin', 'as_manager'] },
    },
  ],
})

// Navigation guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Check if route requires authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  // Check role-based access
  if (to.meta.roles && authStore.userRole) {
    const allowedRoles = to.meta.roles as string[]
    if (!allowedRoles.includes(authStore.userRole)) {
      return next({ name: 'dashboard' })
    }
  }

  // Redirect to dashboard if authenticated user tries to access login
  if (to.name === 'login' && authStore.isAuthenticated) {
    return next({ name: 'dashboard' })
  }

  next()
})

export default router
