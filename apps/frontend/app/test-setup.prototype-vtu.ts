// PROTOTYPE (wayfinder #55): installs PrimeVue for every `mount`, so specs call
// @vue/test-utils' own `mount` and keep its prop typing. No theme: specs
// assert on markup, not styles.
import { config } from '@vue/test-utils';
import PrimeVue from 'primevue/config';

config.global.plugins = [PrimeVue];
