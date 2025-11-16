<template>
  <div class="max-w-4xl mx-auto pb-20 pt-10">
    <Card>
      <template #content>
        <div class="flex flex-col gap-5">
          <div class="flex flex-col">
            <div
                class="h-[210px] bg-no-repeat bg-cover bg-[url('https://www.beate-lessmann.de/images/header/material.jpg')]"/>
            <div class="px-6 py-9 md:px-12 lg:px-[72px] bg-surface-0 dark:bg-surface-950">
              <div class="flex flex-col lg:flex-row justify-between gap-4 relative -mt-8 -top-[70px] -mb-[70px]">
                <div class="flex flex-col gap-4 flex-1">
                  <div
                      class="w-[132px] h-[132px] rounded-lg bg-white dark:bg-surface-950 shadow flex items-center justify-center p-6 overflow-hidden outline outline-[3.5px] outline-surface-0 dark:outline-surface-950"
                  >
                    <img src="https://www.beate-lessmann.de/images/lessmann/logo-lessmann.png" alt=""
                         class="w-[84px] h-[84px]"/>
                  </div>
                  <div class="flex flex-col gap-2 w-full">
                    <div class="text-surface-900 dark:text-surface-0 text-[24.5px] leading-[30.62px] font-bold w-full">
                      Lübecker Lesbarkeitsindex (LÜ-LIX)
                    </div>
                    <div class="text-surface-900 dark:text-surface-100 text-[17.5px] leading-[21.88px] w-full">
                      Entwickelt von Beate Leßmann
                    </div>
                  </div>
                </div>
                <div class="flex items-start gap-4 pt-24 lg:pt-24">
                  <Button label="Website" icon="pi pi-link" severity="secondary" outlined/>
                  <Button icon="pi pi-ellipsis-v" type="button" outlined rounded severity="secondary" @click="toggle"
                          aria-haspopup="true" aria-controls="overlay_menu"/>
                  <Menu ref="menu" id="overlay_menu" :model="items" :popup="true">
                    <template #item="{ item, props }">
                      <NuxtLink :to="item.to" class="flex items-center" v-bind="props.action">
                        <span :class="item.icon"/>
                        <span>{{ item.label }}</span>
                      </NuxtLink>
                    </template>
                  </Menu>
                </div>
              </div>
            </div>
          </div>
          <NuxtPage/>
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
        label: 'Gewichtung',
        icon: 'pi pi-cog',
        to: '/admin'
      },
      {
        label: 'Ergebnisse',
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

const toggle = (event: any) => {
  menu.value.toggle(event);
}
</script>
