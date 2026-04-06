import { createApiClient, type ApiClient, type ResultData } from '@lesbarkeitsindex/api-client';
export type { ResultData };
export type { ResultsResponse as ResultsData } from '@lesbarkeitsindex/api-client';

export const useApiClient = (): ApiClient => {
  const runtime = useRuntimeConfig();
  return createApiClient(runtime.public.apiBase);
};
