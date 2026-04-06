<template>
  <div class="max-w-4xl mx-auto pb-20 pt-4 md:pt-10 px-4 md:px-0">
    <Card>
      <template #content>
        <div class="flex flex-col gap-8">
          <header>
            <div
                class="h-[140px] md:h-[210px] bg-no-repeat bg-cover bg-center bg-[url('https://www.beate-lessmann.de/images/header/material.jpg')]"
                role="img" aria-label="Dekoratives Headerbild"/>
            <div class="px-6 py-9 md:px-12 lg:px-[72px] bg-surface-0">
              <div class="flex flex-col lg:flex-row justify-between gap-4 relative -mt-8 -top-[70px] -mb-[70px]">
                <div class="flex flex-col gap-4 flex-1">
                  <div
                      class="w-[100px] h-[100px] md:w-[132px] md:h-[132px] rounded-lg bg-surface-0 shadow flex items-center justify-center p-4 md:p-6 overflow-hidden outline outline-[3.5px] outline-surface-0"
                  >
                    <img src="https://www.beate-lessmann.de/images/lessmann/logo-lessmann.png" alt="Beate Leßmann Logo"
                         loading="lazy" class="w-[64px] h-[64px] md:w-[84px] md:h-[84px]"/>
                  </div>
                  <div class="flex flex-col gap-2 w-full">
                    <h1 class="text-surface-900 text-xl md:text-2xl leading-tight md:leading-snug font-bold w-full">
                      Lübecker Lesbarkeitsindex (LÜ-LIX)
                    </h1>
                    <p class="text-surface-900 text-sm md:text-lg leading-normal w-full">
                      Entwickelt von Beate Leßmann
                    </p>
                  </div>
                </div>
                <nav class="flex items-start gap-4 pt-4 lg:pt-24" aria-label="Hauptnavigation">
                  <Button label="Zur Website" icon="pi pi-link" severity="secondary" outlined
                          aria-label="Zur Website von Beate Leßmann (öffnet in neuem Fenster)"
                          @click="() => window.open('https://www.beate-lessmann.de', '_blank', 'noopener')"/>
                  <Button icon="pi pi-ellipsis-v" type="button" outlined rounded severity="secondary" @click="toggle"
                          aria-haspopup="true" aria-controls="overlay_menu" aria-label="Menü"/>
                  <Menu ref="menu" id="overlay_menu" :model="items" :popup="true">
                    <template #item="{ item, props }">
                      <NuxtLink :to="item.to" class="flex items-center" v-bind="props.action">
                        <span :class="item.icon"/>
                        <span>{{ item.label }}</span>
                      </NuxtLink>
                    </template>
                  </Menu>
                </nav>
              </div>
            </div>
          </header>
          <main>
            <NuxtPage/>
          </main>
        </div>
      </template>
    </Card>
  </div>
</template>
<script setup lang="ts">
import {useAuthClient} from "~/composables/useAuthClient";
import "primeicons/primeicons.css";

const client = useAuthClient();

const session = client.useSession();

const menu = ref();
const items = computed(() => {
  if (session.value.data) {
    return [
      {
        label: 'Startseite',
        icon: 'pi pi-home',
        to: '/'
      },
      {
        label: 'Bisherige Analysen',
        icon: 'pi pi-list',
        to: '/results'
      },
      {
        label: 'Abmelden',
        icon: 'pi pi-sign-out',
        to: '/logout'
      }
    ];
  }
  return [
    {
      label: 'Startseite',
      icon: 'pi pi-home',
      to: '/'
    },
    {
      label: 'Anmelden',
      icon: 'pi pi-sign-in',
      to: '/login'
    }
  ]
});

const toggle = (event: MouseEvent) => {
  menu.value.toggle(event);
}
</script>
