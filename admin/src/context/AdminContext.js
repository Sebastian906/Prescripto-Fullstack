import { reactive, provide, inject, ref } from 'vue'

const ADMIN_CONTEXT_KEY = Symbol('AdminContext')

export function provideAdminContext() {
    const aToken = ref(
        localStorage.getItem('aToken') || ''
    )

    const state = reactive({
        aToken,
    })

    provide(ADMIN_CONTEXT_KEY, state)
}

export function useAdminContext() {
    return inject(ADMIN_CONTEXT_KEY)
}