import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/Dashboard.vue'),
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/Users.vue'),
    },
    {
      path: '/apps',
      name: 'apps',
      component: () => import('@/views/Apps.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/Profile.vue'),
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const token = window.localStorage.getItem('Authorization')
  if (to.name !== 'login' && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router
