import { reactive, provide, inject } from 'vue'

const DOCTOR_CONTEXT_KEY = Symbol('DoctorContext')

export function provideDoctorContext() {
    const state = reactive({

    })

    provide(DOCTOR_CONTEXT_KEY, state)
}

export function useDoctorContext() {
    return inject(DOCTOR_CONTEXT_KEY)
}