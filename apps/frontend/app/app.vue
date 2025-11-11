<template>
  <div>
    <div class="px-4 py-3 bg-surface-0 dark:bg-surface-900 shadow-sm">
      <div class="max-w-[70rem] mx-auto flex items-center justify-between">
        <NuxtLink to="/" class="font-semibold">Lesbarkeitsindex</NuxtLink>
        <div class="flex items-center gap-3">
          <NuxtLink to="/admin" class="text-sm">Admin</NuxtLink>
          <NuxtLink to="/login" class="text-sm">Login</NuxtLink>
        </div>
      </div>
    </div>
    <NuxtPage />
  </div>
</template>
<script setup lang="ts">
</script>
