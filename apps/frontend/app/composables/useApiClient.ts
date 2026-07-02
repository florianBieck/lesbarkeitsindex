import { createApiClient, type ResultData } from '@lesbarkeitsindex/api-client';
export type { ResultData };
export type { ResultsResponse as ResultsData } from '@lesbarkeitsindex/api-client';

export const useApiClient = (): ReturnType<typeof createApiClient> => {
  const runtime = useRuntimeConfig();
  // Nuxts globales `$fetch` ist ofetch: gleiche Semantik wie zuvor, nur
  // konfiguriert die App jetzt Basis-URL und Cookie-Credentials selbst.
  return createApiClient(
    $fetch.create({ baseURL: runtime.public.apiBase, credentials: 'include' }),
  );
};
