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
                <div class="flex items-start pt-4 lg:pt-24">
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
                </div>
              </div>
            </div>
          </header>
          <main>
            <RouterView />
          </main>
          <LegalLinks />
        </div>
      </template>
    </Card>
  </div>
</template>
<script setup lang="ts">
import Button from 'primevue/button';
import Card from 'primevue/card';
import { RouterView } from 'vue-router';
import logoUrl from '@/assets/logo-lessmann.png';
import LegalLinks from '@/components/legal-links.vue';
</script>
