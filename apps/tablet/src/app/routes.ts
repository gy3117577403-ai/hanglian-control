import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth-store'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/tablet',
    },
    {
      path: '/tablet',
      name: 'tablet-dashboard',
      component: () => import('@/views/TabletDashboard.vue'),
      meta: { public: true },
    },
    {
      path: '/login',
      name: 'warm-login',
      component: () => import('@/views/WarmLoginView.vue'),
      meta: { public: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (auth.token && !auth.currentUser) {
    await auth.loadMe()
  }

  if (to.meta.public) {
    if (auth.loggedIn && to.path === '/login') return '/tablet'
    return true
  }

  if (!auth.loggedIn) return to.path === '/tablet' ? true : '/login'
  return true
})
