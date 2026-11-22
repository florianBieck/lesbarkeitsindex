import { createApiClient, type ResultData } from '@lesbarkeitsindex/api-client';
import { apiFetch } from './api-fetch';
export type { ResultData };

export const useApiClient = (): ReturnType<typeof createApiClient> => createApiClient(apiFetch);
