import Aura from '@primeuix/themes/aura';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/eslint',
    '@nuxt/test-utils',
    '@primevue/nuxt-module',
    '@nuxtjs/tailwindcss'
  ],
  primevue: {
    options: {
      theme: {
        preset: Aura
      }
    }
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000'
    }
  },
  devServer: {
    port: 3001
  }
})