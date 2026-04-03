import { provide, inject, ref } from 'vue'
import { useToast } from 'vue-toastification'
import axios from 'axios'

const ADMIN_CONTEXT_KEY = Symbol('AdminContext')

export function provideAdminContext() {
    const toast = useToast()

    const aToken = ref(localStorage.getItem('aToken') || '')
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const doctors = ref([])
    const appointments = ref([])
    const dashData = ref([])
    const annualReport = ref(null)
    const monthlyTrend = ref([])
    const reportYear = ref(new Date().getFullYear())

    const setAToken = (token) => {
        aToken.value = token
        if (token) {
            localStorage.setItem('aToken', token)
        } else {
            localStorage.removeItem('aToken')
        }
    }

    const getAllDoctors = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/all-doctors', { headers: { atoken: aToken.value } })
            if (data.success) {
                doctors.value = data.doctors
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const changeAvailability = async (docId) => {
        try {
            const { data } = await axios.patch(`${backendUrl}/api/doctors/change-availability/${docId}`, {}, { headers: { atoken: aToken.value } })
            if (data.success) {
                toast.success(data.message)
                await getAllDoctors()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const getAllAppointments = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/appointments', { headers: { atoken: aToken.value } })
            if (data.success) {
                appointments.value = data.appointments
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const cancelAppointment = async (appointmentId) => {
        try {
            const { data } = await axios.patch(backendUrl + '/api/admin/cancel-appointment', { appointmentId }, { headers: { atoken: aToken.value } })
            if (data.success) {
                toast.success(data.message)
                await getAllAppointments()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const getDashData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/dashboard', { headers: { atoken: aToken.value } })
            if (data.success) {
                dashData.value = data.dashData
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const getAnnualReport = async (year = reportYear.value, docId = null) => {
        try {
            const params = { year }
            if (docId) params.docId = docId
            const { data } = await axios.get(backendUrl + '/api/reports/annual', { headers: { atoken: aToken.value }, params })
            if (data.success) {
                annualReport.value = data
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const getMonthlyTrend = async (months = 12, docId = null) => {
        try {
            const params = { months }
            if (docId) params.docId = docId
            const { data } = await axios.get(backendUrl + '/api/reports/trend', { headers: { atoken: aToken.value }, params })
            if (data.success) {
                monthlyTrend.value = data.trend
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    provide(ADMIN_CONTEXT_KEY, { aToken, backendUrl, setAToken, doctors, getAllDoctors, changeAvailability, appointments, getAllAppointments, cancelAppointment, dashData, getDashData, annualReport, monthlyTrend, reportYear, getAnnualReport, getMonthlyTrend })
}

export function useAdminContext() {
    return inject(ADMIN_CONTEXT_KEY)
}