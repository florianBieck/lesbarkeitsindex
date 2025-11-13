import {createAuthClient} from 'better-auth/vue'

export const plugins = [
]

export const useAuthClient = () => {
    return createAuthClient({
        baseURL: "http://localhost:3000",
        plugins,
    })
}