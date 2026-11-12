import { createAuthClient } from 'better-auth/vue';
import { adminClient } from 'better-auth/client/plugins';

// Without a baseURL, Better-Auth calls `/api/auth` on the page's own origin and sends
// the cookies along: the browser only ever talks to that origin (ADR 0007).
export const useAuthClient = () => createAuthClient({ plugins: [adminClient()] });
