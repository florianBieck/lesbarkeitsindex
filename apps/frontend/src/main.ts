import '@/assets/main.css';
import 'primeicons/primeicons.css';
import Aura from '@primeuix/themes/aura';
import PrimeVue from 'primevue/config';
import { createApp } from 'vue';
import App from '@/app.vue';
import { router } from '@/router';

// After a deploy, an open tab still points at the old hashed chunks, which are gone.
// A lazy import (the score chart) then fails: reload to pick up the new build.
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

createApp(App)
  .use(router)
  .use(PrimeVue, { theme: { preset: Aura, options: { darkModeSelector: false } } })
  .mount('#app');
