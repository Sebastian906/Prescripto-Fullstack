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
    const profileData = ref([])
    const schedulingSuggestions = ref(null)

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
            const msg = error?.response?.data?.message ?? error.message
            toast.error(msg)
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

    const getProfileData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/doctors/profile', { headers: { dtoken: dToken.value } })
            if (data.success) {
                profileData.value = data.profileData
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const updateProfileData = async (updateData) => {
        try {
            const { data } = await axios.patch(backendUrl + '/api/doctors/update-profile', updateData, { headers: { dtoken: dToken.value } })
            if (data.success) {
                toast.success(data.message)
                await getProfileData()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const getSchedulingSuggestions = async (preferredDates, priorityLevel = 'normal') => {
        try {
            if (!profileData.value?._id) await getProfileData()
            const docId = profileData.value._id

            const { data } = await axios.post(backendUrl + '/api/scheduling/suggest-slot', { docId, preferredDates, priorityLevel }, { headers: { token: dToken.value } })
            if (data.suggestions) {
                schedulingSuggestions.value = data
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    provide(DOCTOR_CONTEXT_KEY, { dToken, setDToken, backendUrl, appointments, getAppointments, completeAppointment, cancelAppointment, dashData, getDashData, profileData, getProfileData, updateProfileData, schedulingSuggestions, getSchedulingSuggestions })
}

export function useDoctorContext() {
    return inject(DOCTOR_CONTEXT_KEY)
}