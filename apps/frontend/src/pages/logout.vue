<template>
  <div class="px-6 py-20 md:px-20 lg:px-80">
    <div
      class="mx-auto flex w-full max-w-sm flex-col gap-8 rounded-2xl bg-surface-0 p-8 shadow-xs md:p-12"
    >
      <div class="flex flex-col items-center gap-4">
        <div class="flex w-full flex-col items-center gap-2">
          <h2 class="w-full text-center text-2xl leading-tight font-semibold text-surface-900">
            Warte auf Abmeldung...
          </h2>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthClient } from '@/composables/useAuthClient';

const client = useAuthClient();
const router = useRouter();

onMounted(async () => {
  const session = await client.getSession();
  if (session.data) {
    await client.signOut({
      fetchOptions: {
        onSuccess: async () => {
          await router.push('/login');
        },
      },
    });
  }
});
</script>
