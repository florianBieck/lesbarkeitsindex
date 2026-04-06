import { createAuthClient } from 'better-auth/vue';
import { adminClient } from 'better-auth/client/plugins';

export const plugins = [adminClient()];

export const useAuthClient = () => {
  const runtime = useRuntimeConfig();
  const apiBase = runtime.public.apiBase;

  return createAuthClient({
    baseURL: apiBase,
    fetchOptions: {
      credentials: 'include',
    },
    plugins,
  });
};
