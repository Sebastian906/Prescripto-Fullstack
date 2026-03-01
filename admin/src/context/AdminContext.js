import { provide, inject, ref } from 'vue'

const ADMIN_CONTEXT_KEY = Symbol('AdminContext')

export function provideAdminContext() {
    const aToken = ref(
        localStorage.getItem('aToken') || ''
    )
    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const setAToken = (token) => {
        aToken.value = token
        if (token) {
            localStorage.setItem('aToken', token)
        } else {
            localStorage.removeItem('aToken')
        }
    }

    provide(ADMIN_CONTEXT_KEY, { aToken, backendUrl, setAToken })
}

export function useAdminContext() {
    return inject(ADMIN_CONTEXT_KEY)
}