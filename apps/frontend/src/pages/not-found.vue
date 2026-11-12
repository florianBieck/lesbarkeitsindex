<template>
  <div
    class="mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-surface-0 p-8 text-center shadow-xs md:p-12"
  >
    <h2 class="text-2xl leading-tight font-semibold text-surface-900">Seite nicht gefunden</h2>
    <p class="leading-normal text-surface-700">
      Diese Adresse gibt es hier nicht. Vielleicht ist der Link veraltet oder enthält einen
      Tippfehler.
    </p>
    <RouterLink to="/" class="text-primary-700 hover:underline">Zur Startseite</RouterLink>
  </div>
</template>
<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>
