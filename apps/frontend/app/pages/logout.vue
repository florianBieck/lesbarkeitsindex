<template>
  <div class="bg-surface-50 px-6 py-20 md:px-20 lg:px-80">
    <div
      class="bg-surface-0 p-8 md:p-12 shadow-sm rounded-2xl w-full max-w-sm mx-auto flex flex-col gap-8"
    >
      <div class="flex flex-col items-center gap-4">
        <div class="flex items-center gap-4">
          <AppLogo />
        </div>
        <div class="flex flex-col items-center gap-2 w-full">
          <h2 class="text-surface-900 text-2xl font-semibold leading-tight text-center w-full">
            Warte auf Abmeldung...
          </h2>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useAuthClient } from '~/composables/useAuthClient';

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
