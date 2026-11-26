import { createRouter, createWebHistory } from 'vue-router';
import DocumentationPage from '@/pages/documentation.vue';
import IndexPage from '@/pages/index.vue';
import NotFoundPage from '@/pages/not-found.vue';

/** The app's routes, by hand (ADR 0007): every page open to every visitor (ADR 0008). */
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: IndexPage },
    { path: '/dokumentation', component: DocumentationPage },
    // The backend answers every unknown app path with index.html, so the router decides.
    { path: '/:pathMatch(.*)*', component: NotFoundPage },
  ],
  // Top of the page on navigation, the saved position on back and forward.
  scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 },
});
