import axios from 'axios'
import { provide, inject, ref } from 'vue'
import { useToast } from 'vue-toastification'

const DOCTOR_CONTEXT_KEY = Symbol('DoctorContext')

export function provideDoctorContext() {
    const toast = useToast()
    const dToken = ref(localStorage.getItem('dToken') || '')
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const appointments = ref([])
    const dashData = ref([])

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

    const completeAppointment = async (appointmentId) => {
        try {
            const { data } = await axios.patch(backendUrl + '/api/doctors/complete-appointment', { appointmentId }, { headers: { dtoken: dToken.value } })
            if (data.success) {
                toast.success(data.message)
                await getAppointments()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const cancelAppointment = async (appointmentId) => {
        try {
            const { data } = await axios.patch(backendUrl + '/api/doctors/cancel-appointment', { appointmentId }, { headers: { dtoken: dToken.value } })
            if (data.success) {
                toast.success(data.message)
                await getAppointments()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const getDashData = async () => {
    try {
        const { data } = await axios.get(backendUrl + '/api/doctors/dashboard', { headers: { dtoken: dToken.value } })
        if (data.success) {
            dashData.value = data.dashData
        } else {
            toast.error(data.message)
        }
    } catch (error) {
        toast.error(error.message)
    }
}

    provide(DOCTOR_CONTEXT_KEY, { dToken, setDToken, backendUrl, appointments, getAppointments, completeAppointment, cancelAppointment, dashData, getDashData })
}

export function useDoctorContext() {
    return inject(DOCTOR_CONTEXT_KEY)
}