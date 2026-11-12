<template>
  <div
    class="bg-surface-0 p-8 md:p-12 shadow-sm rounded-2xl w-full max-w-sm mx-auto flex flex-col items-center gap-4 text-center"
  >
    <h2 class="text-surface-900 text-2xl font-semibold leading-tight">Seite nicht gefunden</h2>
    <p class="text-surface-700 leading-normal">
      Diese Adresse gibt es hier nicht. Vielleicht ist der Link veraltet oder enthält einen
      Tippfehler.
    </p>
    <RouterLink to="/" class="text-primary hover:underline">Zur Startseite</RouterLink>
  </div>
</template>
<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>
