import Aura from '@primeuix/themes/aura';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  app: {
    head: {
      htmlAttrs: {
        lang: 'de',
      },
    },
  },
  devtools: { enabled: true },
  modules: ['@primevue/nuxt-module', '@nuxtjs/tailwindcss'],
  primevue: {
    options: {
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: false,
        },
      },
    },
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000',
      // PROTOTYPE (#56), throwaway: NUXT_PUBLIC_PROTOTYPE_SWITCHER=true shows the switcher in a prod build
      prototypeSwitcher: false,
    },
  },
  devServer: {
    port: 3001,
  },
});
