<template>
  <div class="px-6 py-8 md:px-20 lg:px-80">
    <div class="bg-surface-0 dark:bg-surface-900 p-8 md:p-12 shadow-sm rounded-2xl w-full max-w-[32rem] mx-auto flex flex-col gap-6">
      <div class="text-xl font-semibold">Login</div>
      <div class="flex flex-col gap-3">
        <label class="text-sm">E-Mail</label>
        <InputText v-model="email" type="email" placeholder="name@example.com" />
        <label class="text-sm">Passwort</label>
        <Password v-model="password" toggleMask :feedback="false" />
      </div>
      <div class="flex gap-2">
        <Button :loading="loading" label="Anmelden" icon="pi pi-sign-in" @click="login" />
        <Button :loading="loading" label="Registrieren" icon="pi pi-user-plus" severity="secondary" @click="registerUser" />
        <Button v-if="session" label="Abmelden" icon="pi pi-sign-out" severity="danger" @click="logout" />
      </div>
      <div class="text-sm text-surface-500">{{ message }}</div>
      <div v-if="session" class="text-sm">
        Eingeloggt als: <b>{{ session.user?.email }}</b>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'

const email = ref('')
const password = ref('')
const loading = ref(false)
const message = ref('')
const session = ref<any | null>(null)

const runtime = useRuntimeConfig()
const apiBase = runtime.public.apiBase

async function getSession() {
  try {
    session.value = await $fetch(`${apiBase}/user`, { credentials: 'include' })
  } catch {
    session.value = null
  }
}

async function login() {
  loading.value = true
  message.value = ''
  try {
    await $fetch(`${apiBase}/sign-in/email`, {
      method: 'POST',
      credentials: 'include',
      body: { email: email.value, password: password.value }
    })
    await getSession()
    message.value = 'Erfolgreich angemeldet.'
  } catch (e: any) {
    message.value = e?.data?.message || 'Anmeldung fehlgeschlagen.'
  } finally {
    loading.value = false
  }
}

async function registerUser() {
  loading.value = true
  message.value = ''
  try {
    await $fetch(`${apiBase}/sign-up/email`, {
      method: 'POST',
      credentials: 'include',
      body: { email: email.value, password: password.value }
    })
    await getSession()
    message.value = 'Konto erstellt und angemeldet.'
  } catch (e: any) {
    message.value = e?.data?.message || 'Registrierung fehlgeschlagen.'
  } finally {
    loading.value = false
  }
}

async function logout() {
  await $fetch(`${apiBase}/sign-out`, { method: 'POST', credentials: 'include' })
  await getSession()
}

onMounted(() => {
  getSession()
})
</script>
