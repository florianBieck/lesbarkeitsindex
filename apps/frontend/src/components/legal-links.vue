<template>
  <footer v-if="links.length > 0" class="border-t border-surface-200 pt-6">
    <nav class="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm" aria-label="Rechtliches">
      <a
        v-for="link in links"
        :key="link.label"
        :href="link.href"
        target="_blank"
        rel="noopener noreferrer"
        class="text-surface-600 underline hover:text-surface-900"
      >
        {{ link.label }}
      </a>
    </nav>
  </footer>
</template>
<script setup lang="ts">
import type { Config } from '@lesbarkeitsindex/api-client';
import { computed, onMounted, ref } from 'vue';
import { useApiClient } from '@/composables/useApiClient';

// Links zu Impressum und Datenschutz (ADR 0008). Die Adressen stehen optional in
// der config.json der Betreuung; ein Link ohne Adresse erscheint nicht, und ohne
// beide gibt es keine Fußzeile. Die Seiten selbst gehören nicht zur App.
const client = useApiClient();
const config = ref<Config | null>(null);

const links = computed(() =>
  [
    { label: 'Impressum', href: config.value?.impressumUrl },
    { label: 'Datenschutz', href: config.value?.datenschutzUrl },
  ].filter((link) => link.href),
);

onMounted(async () => {
  try {
    config.value = await client.getConfig();
  } catch (e) {
    // Ohne Konfiguration keine Links; die Startseite meldet eine fehlerhafte Datei selbst.
    console.error('Links der Fußzeile konnten nicht geladen werden', e);
  }
});
</script>
