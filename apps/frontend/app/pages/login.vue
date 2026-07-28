<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col items-center gap-4">
      <div class="flex items-center gap-4">
        <AppLogo />
      </div>
      <div class="flex flex-col items-center gap-2 w-full">
        <h2 class="text-surface-900 text-2xl font-semibold leading-tight text-center w-full">
          Anmelden
        </h2>
      </div>
    </div>
    <div class="flex flex-col gap-6 w-full">
      <div class="flex flex-col gap-2 w-full">
        <label for="email1" class="text-surface-900 font-medium leading-normal"
          >E-Mail Adresse</label
        >
        <InputText
          id="email1"
          v-model="email"
          fluid
          type="text"
          placeholder="E-Mail-Adresse"
          class="px-3 py-2 shadow-sm rounded-lg"
        />
      </div>
      <div class="flex flex-col gap-2 w-full">
        <label for="password1" class="text-surface-900 font-medium leading-normal">Passwort</label>

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
        <label for="rememberme1" class="text-surface-900 leading-normal">Angemeldet bleiben</label>
      </div>
    </div>
    <div v-if="errorMessage" class="text-red-600 text-sm font-medium" role="alert">
      {{ errorMessage }}
    </div>
    <Button
      @click="login"
      :loading="isLoading"
      label="Anmelden"
      icon="pi pi-user"
      fluid
      class="w-full py-3 rounded-lg flex justify-center items-center gap-2"
    >
      <template #icon>
        <i class="pi pi-user text-base! leading-normal!" />
      </template>
    </Button>
  </div>
</template>
<script lang="ts" setup>
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
