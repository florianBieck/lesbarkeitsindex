import {type Treaty, treaty} from '@elysiajs/eden'
import type {App} from '../../../backend/src'

export type ApiClient = ReturnType<typeof treaty<App>>
declare const _client: ApiClient
export type ResultData = Treaty.Data<typeof _client.calculate.post>
export type ResultsData = Treaty.Data<typeof _client.results.get>

export const useApiClient = (): ApiClient => {
    const runtime = useRuntimeConfig()
    return treaty<App>(runtime.public.apiBase, {
        fetch: {
            credentials: 'include',
        },
    })
}
