import {createAuthClient} from 'better-auth/vue'

export const plugins = [
]

export const useAuthClient = () => {
    const runtime = useRuntimeConfig();
    const apiBase = runtime.public.apiBase;

    return createAuthClient({
        baseURL: apiBase,
        fetchOptions: {
            credentials: 'include'
        },
        plugins,
    })
}