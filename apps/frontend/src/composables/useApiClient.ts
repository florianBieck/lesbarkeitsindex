import { createApiClient, type ResultData } from '@lesbarkeitsindex/api-client';
import { apiFetch } from './api-fetch';
export type { ResultData };
export type { ResultsResponse as ResultsData } from '@lesbarkeitsindex/api-client';

export const useApiClient = (): ReturnType<typeof createApiClient> => createApiClient(apiFetch);
