import { reactive, provide, inject, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const ADMIN_CONTEXT_KEY = Symbol('AdminContext')

export function provideAdminContext() {
    const aToken = ref(
        localStorage.getItem('aToken') || ''
    )
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const router = useRouter()

    const state = reactive({
        aToken,
        backendUrl,
        setAToken: (token) => {
            aToken.value = token
        }
    })

    watch(
        () => aToken.value,
        (newToken) => {
            if (!newToken) {
                router.push('/login')
            }
        },
        { immediate: true }
    )

    provide(ADMIN_CONTEXT_KEY, state)
}

export function useAdminContext() {
    return inject(ADMIN_CONTEXT_KEY)
}