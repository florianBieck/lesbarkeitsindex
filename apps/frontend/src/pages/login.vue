<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col items-center gap-4">
      <div class="flex w-full flex-col items-center gap-2">
        <h2 class="w-full text-center text-2xl leading-tight font-semibold text-surface-900">
          Anmelden
        </h2>
      </div>
    </div>
    <div class="flex w-full flex-col gap-6">
      <div class="flex w-full flex-col gap-2">
        <label for="email1" class="leading-normal font-medium text-surface-900"
          >E-Mail Adresse</label
        >
        <InputText id="email1" v-model="email" fluid type="text" placeholder="E-Mail-Adresse" />
      </div>
      <div class="flex w-full flex-col gap-2">
        <label for="password1" class="leading-normal font-medium text-surface-900">Passwort</label>

        <Password
          id="password1"
          v-model="password"
          fluid
          placeholder="Passwort"
          :toggleMask="true"
          :feedback="false"
        />
      </div>
      <div class="flex items-center gap-2">
        <Checkbox id="rememberme1" v-model="checked1" :binary="true" />
        <label for="rememberme1" class="leading-normal text-surface-900">Angemeldet bleiben</label>
      </div>
    </div>
    <div v-if="errorMessage" class="text-sm font-medium text-red-600" role="alert">
      {{ errorMessage }}
    </div>
    <Button @click="login" :loading="isLoading" label="Anmelden" icon="pi pi-user" fluid />
  </div>
</template>
<script lang="ts" setup>
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import { ref } from 'vue';
import { useAuthClient } from '@/composables/useAuthClient';

const client = useAuthClient();

const email = ref('');
const password = ref('');
const checked1 = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');

const login = async () => {
  errorMessage.value = '';

  if (!email.value.trim() || !password.value) {
    errorMessage.value = 'Bitte geben Sie E-Mail und Passwort ein.';
    return;
  }

  isLoading.value = true;
  try {
    const { data, error } = await client.signIn.email({
      email: email.value,
      password: password.value,
      rememberMe: checked1.value,
      callbackURL: window.location.origin,
    });
    if (error) {
      errorMessage.value = 'Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben.';
    }
  } catch (e) {
    errorMessage.value = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
  } finally {
    isLoading.value = false;
  }
};
</script>
