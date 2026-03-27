import { provide, inject, ref } from 'vue'

const DOCTOR_CONTEXT_KEY = Symbol('DoctorContext')

export function provideDoctorContext() {
    const dToken = ref(localStorage.getItem('dToken') || '')
    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const setDToken = (token) => {
        dToken.value = token
        if (token) {
            localStorage.setItem('dToken', token)
        } else {
            localStorage.removeItem('dToken')
        }
    }

    provide(DOCTOR_CONTEXT_KEY, { dToken, setDToken, backendUrl })
}

export function useDoctorContext() {
    return inject(DOCTOR_CONTEXT_KEY)
}