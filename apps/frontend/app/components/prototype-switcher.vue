<template>
  <div
    class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-3 rounded-full bg-black/85 text-white px-3 py-2 shadow-lg text-sm font-mono"
    data-prototype-switcher
  >
    <button type="button" class="px-2 hover:text-yellow-300" aria-label="Vorherige Variante" @click="cycle(-1)">←</button>
    <span>{{ current.key }} · {{ current.name }}</span>
    <button type="button" class="px-2 hover:text-yellow-300" aria-label="Nächste Variante" @click="cycle(1)">→</button>
  </div>
</template>
<script setup lang="ts">
// PROTOTYPE (#56), throwaway. Never merge.
import '~/assets/prototype-dead-classes.css';

const VARIANTS = [
  { key: 'A', name: 'Heute (Klassen tot)', colors: false, utils: false, aa: false, proposal: false },
  { key: 'B', name: 'Alles live (primeui + cssLayer)', colors: true, utils: true, aa: false, proposal: false },
  { key: 'C', name: 'Live + AA-Korrektur', colors: true, utils: true, aa: true, proposal: false },
  { key: 'D', name: 'Vorschlag', colors: true, utils: false, aa: true, proposal: true },
] as const;

const route = useRoute();
const mounted = ref(false);
const router = useRouter();

const current = computed(
  () => VARIANTS.find((v) => v.key === String(route.query.variant ?? 'A').toUpperCase()) ?? VARIANTS[0],
);

useHead({
  htmlAttrs: computed(() => ({
    'data-proto-variant': current.value.key,
    'data-proto-colors': current.value.colors ? '' : undefined,
    'data-proto-utils': current.value.utils ? '' : undefined,
    'data-proto-aa': current.value.aa ? '' : undefined,
    'data-proto-proposal': current.value.proposal ? '' : undefined,
    'data-proto-mounted': mounted.value ? '' : undefined,
  })),
});

const cycle = (step: number) => {
  const index = VARIANTS.findIndex((v) => v.key === current.value.key);
  const next = VARIANTS[(index + step + VARIANTS.length) % VARIANTS.length]!;
  router.replace({ query: { ...route.query, variant: next.key } });
};

const onKey = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null;
  if (target?.closest('input, textarea, [contenteditable]')) return;
  if (event.key === 'ArrowLeft') cycle(-1);
  if (event.key === 'ArrowRight') cycle(1);
};

onMounted(() => {
  mounted.value = true;
  window.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>
