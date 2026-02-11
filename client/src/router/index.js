import { createRouter, createWebHistory } from 'vue-router';
import { authApi } from '../services/api.js';

const LoginCard = () => import('../components/LoginCard.vue');
const Dashboard = () => import('../components/Dashboard.vue');

const dashRoute = (path, name) => ({
  path,
  name,
  component: Dashboard,
  meta: { requiresAuth: true }
});

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginCard,
    meta: { guest: true }
  },
  dashRoute('/', 'dashboard'),
  dashRoute('/network', 'network'),
  dashRoute('/security', 'security'),
  dashRoute('/devices', 'devices'),
  dashRoute('/alerts', 'alerts'),
  dashRoute('/reports', 'reports'),
  dashRoute('/tools', 'networkTools'),
  dashRoute('/settings', 'settings'),
  dashRoute('/profile', 'profile'),
  dashRoute('/admin', 'admin'),
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation guard — auth check
router.beforeEach((to, from, next) => {
  const isAuthenticated = authApi.isAuthenticated();

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'login' });
  }

  if (to.meta.guest && isAuthenticated) {
    return next({ name: 'dashboard' });
  }

  next();
});

export default router;
