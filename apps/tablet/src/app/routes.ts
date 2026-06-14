import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth-store'
import TabletDashboard from '@/views/TabletDashboard.vue'
import WarmLoginView from '@/views/WarmLoginView.vue'

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
      component: TabletDashboard,
    },
    {
      path: '/login',
      name: 'warm-login',
      component: WarmLoginView,
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

  if (!auth.loggedIn) return '/login'
  return true
})
