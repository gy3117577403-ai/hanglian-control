import { createRouter, createWebHistory } from 'vue-router'
import TabletDashboard from '@/views/TabletDashboard.vue'

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
  ],
})
