<template>
  <div class="mx-auto max-w-4xl px-4 pt-4 pb-20 md:px-0 md:pt-10">
    <Card>
      <template #content>
        <div class="flex flex-col gap-8">
          <header>
            <div
              class="h-[140px] bg-[url('@/assets/material.jpg')] bg-cover bg-center bg-no-repeat md:h-[210px]"
              role="img"
              aria-label="Dekoratives Headerbild"
            />
            <div class="bg-surface-0 px-6 py-9 md:px-12 lg:px-[72px]">
              <div
                class="relative -top-[70px] -mt-8 -mb-[70px] flex flex-col justify-between gap-4 lg:flex-row"
              >
                <div class="flex flex-1 flex-col gap-4">
                  <div
                    class="flex h-[100px] w-[100px] items-center justify-center overflow-hidden rounded-lg bg-surface-0 p-4 shadow-sm outline-[3.5px] outline-surface-0 outline-solid md:h-[132px] md:w-[132px] md:p-6"
                  >
                    <img
                      :src="logoUrl"
                      alt="Beate Leßmann Logo"
                      loading="lazy"
                      class="h-[64px] w-[64px] md:h-[84px] md:w-[84px]"
                    />
                  </div>
                  <div class="flex w-full flex-col gap-2">
                    <h1
                      class="w-full text-xl leading-tight font-bold text-surface-900 md:text-2xl md:leading-snug"
                    >
                      Lübecker Lesbarkeitsindex (LÜ-LIX)
                    </h1>
                    <p class="w-full text-sm leading-normal text-surface-900 md:text-lg">
                      Entwickelt von Beate Leßmann
                    </p>
                  </div>
                </div>
                <nav class="flex items-start gap-4 pt-4 lg:pt-24" aria-label="Hauptnavigation">
                  <Button
                    as="a"
                    href="https://www.beate-lessmann.de"
                    target="_blank"
                    rel="noopener"
                    label="Zur Website"
                    icon="pi pi-link"
                    severity="secondary"
                    outlined
                    aria-label="Zur Website von Beate Leßmann (öffnet in neuem Fenster)"
                  />
                  <Button
                    icon="pi pi-ellipsis-v"
                    type="button"
                    outlined
                    rounded
                    severity="secondary"
                    @click="toggle"
                    aria-haspopup="true"
                    aria-controls="overlay_menu"
                    aria-label="Menü"
                  />
                  <Menu ref="menu" id="overlay_menu" :model="items" :popup="true">
                    <template #item="{ item, props }">
                      <RouterLink :to="item.to" class="flex items-center" v-bind="props.action">
                        <span :class="item.icon" />
                        <span>{{ item.label }}</span>
                      </RouterLink>
                    </template>
                  </Menu>
                </nav>
              </div>
            </div>
          </header>
          <main>
            <RouterView />
          </main>
        </div>
      </template>
    </Card>
  </div>
</template>
<script setup lang="ts">
import Button from 'primevue/button';
import Card from 'primevue/card';
import Menu from 'primevue/menu';
import { computed, ref } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import logoUrl from '@/assets/logo-lessmann.png';
import { useAuthClient } from '@/composables/useAuthClient';

const client = useAuthClient();

const session = client.useSession();

const menu = ref();
const items = computed(() => {
  if (session.value.data) {
    return [
      {
        label: 'Startseite',
        icon: 'pi pi-home',
        to: '/',
      },
      {
        label: 'Bisherige Analysen',
        icon: 'pi pi-list',
        to: '/results',
      },
      {
        label: 'Konfiguration',
        icon: 'pi pi-cog',
        to: '/admin',
      },
      {
        label: 'Abmelden',
        icon: 'pi pi-sign-out',
        to: '/logout',
      },
    ];
  }
  return [
    {
      label: 'Startseite',
      icon: 'pi pi-home',
      to: '/',
    },
    {
      label: 'Anmelden',
      icon: 'pi pi-sign-in',
      to: '/login',
    },
  ];
});

const toggle = (event: MouseEvent) => {
  menu.value.toggle(event);
};
</script>
