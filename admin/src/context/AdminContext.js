import { reactive, provide, inject, ref } from 'vue'

const ADMIN_CONTEXT_KEY = Symbol('AdminContext')

export function provideAdminContext() {
    const aToken = ref(
        localStorage.getItem('aToken') || ''
    )
    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const state = reactive({
        aToken,
        backendUrl,
        setAToken: (token) => {
            aToken.value = token
        }
    })

    provide(ADMIN_CONTEXT_KEY, state)
}

export function useAdminContext() {
    return inject(ADMIN_CONTEXT_KEY)
}