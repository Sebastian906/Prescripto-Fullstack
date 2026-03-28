import axios from 'axios'
import { provide, inject, ref } from 'vue'
import { useToast } from 'vue-toastification'

const DOCTOR_CONTEXT_KEY = Symbol('DoctorContext')

export function provideDoctorContext() {
    const toast = useToast()
    const dToken = ref(localStorage.getItem('dToken') || '')
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const appointments = ref([])

    const setDToken = (token) => {
        dToken.value = token
        if (token) {
            localStorage.setItem('dToken', token)
        } else {
            localStorage.removeItem('dToken')
        }
    }

    const getAppointments = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/doctors/appointments', { headers: { dtoken: dToken.value } })
            if (data.success) {
                appointments.value = [...data.appointments].reverse()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    provide(DOCTOR_CONTEXT_KEY, { dToken, setDToken, backendUrl, appointments, getAppointments })
}

export function useDoctorContext() {
    return inject(DOCTOR_CONTEXT_KEY)
}