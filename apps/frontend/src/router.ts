import { createRouter, createWebHistory } from 'vue-router';
import AdminPage from '@/pages/admin.vue';
import IndexPage from '@/pages/index.vue';
import LoginPage from '@/pages/login.vue';
import LogoutPage from '@/pages/logout.vue';
import NotFoundPage from '@/pages/not-found.vue';
import ResultsPage from '@/pages/results.vue';

/**
 * The app's routes, by hand (ADR 0007). No guards: the backend's `AuthGuard`
 * decides what a visitor may load.
 */
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: IndexPage },
    { path: '/login', component: LoginPage },
    { path: '/logout', component: LogoutPage },
    { path: '/results', component: ResultsPage },
    { path: '/admin', component: AdminPage },
    // The backend answers every unknown app path with index.html, so the router decides.
    { path: '/:pathMatch(.*)*', component: NotFoundPage },
  ],
  // Top of the page on navigation, the saved position on back and forward.
  scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 },
});
