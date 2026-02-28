import { reactive, provide, inject } from 'vue'

const APP_CONTEXT_KEY = Symbol('AppContext')

export function provideAppContext() {
    const state = reactive({
        
    })

    provide(APP_CONTEXT_KEY, state)
}

export function useAppContext() {
    return inject(APP_CONTEXT_KEY)
}