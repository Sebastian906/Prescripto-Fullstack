import { provide, inject, ref } from 'vue'
import { useToast } from 'vue-toastification'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

const ADMIN_CONTEXT_KEY = Symbol('AdminContext')

export function provideAdminContext() {
    const toast = useToast()
    const { t } = useI18n()

    const aToken = ref(localStorage.getItem('aToken') || '')
    const backendUrl = import.meta.env.VITE_BACKEND_URL

    /** Normalize Axios and validation errors into one display string. */
    const toErrorMessage = (error, fallback) => {
        const message = error?.response?.data?.message
        if (Array.isArray(message)) return message.join(', ')
        return message || error?.message || fallback
    }
    const doctors = ref([])
    const reviewCounts = ref({})
    const appointments = ref([])
    const dashData = ref([])
    const annualReport = ref(null)
    const monthlyTrend = ref([])
    const reportYear = ref(new Date().getFullYear())
    const notifications = ref([])
    const medicalRecordsStatus = ref(null)
    const medicalRecordsStatusLoading = ref(false)
    const prescriptionsStatus = ref(null)
    const prescriptionsStatusLoading = ref(false)

    const setAToken = (token) => {
        aToken.value = token
        if (token) {
            localStorage.setItem('aToken', token)
        } else {
            localStorage.removeItem('aToken')
            // Sin sesion admin no deben quedar notificaciones retenidas visibles.
            notifications.value = []
            medicalRecordsStatus.value = null
            prescriptionsStatus.value = null
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

    const REVIEW_COUNT_CONCURRENCY = 5

    /**
     * Fetch review counts for a doctor list, max 5 requests in flight.
     * undefined = pending, null = failed, number = successful count.
     */
    const getReviewCounts = async (doctorList = doctors.value) => {
        const ids = (doctorList || []).map((doctor) => doctor._id).filter(Boolean)
        ids.forEach((docId) => {
            reviewCounts.value[docId] = undefined
        })
        let next = 0

        const worker = async () => {
            while (next < ids.length) {
                const docId = ids[next++]
                try {
                    const { data } = await axios.get(
                        `${backendUrl}/api/doctors/${docId}/rating`,
                    )
                    reviewCounts.value[docId] = Number(data?.reviewCount) || 0
                } catch {
                    reviewCounts.value[docId] = null
                }
            }
        }

        await Promise.all(
            Array.from(
                { length: Math.min(REVIEW_COUNT_CONCURRENCY, ids.length) },
                () => worker(),
            ),
        )
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

    // Log operativo de notificaciones (solo lectura, todos los usuarios).
    const getAllNotifications = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/notifications', { headers: { atoken: aToken.value } })
            if (data.success) {
                notifications.value = data.notifications
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const getMedicalRecordsStatus = async () => {
        if (!aToken.value) return
        medicalRecordsStatusLoading.value = true
        try {
            const { data } = await axios.get(backendUrl + '/api/medical-records/status', {
                headers: { atoken: aToken.value },
            })
            medicalRecordsStatus.value = data
        } catch (error) {
            medicalRecordsStatus.value = null
            console.error('[medical-records] status request failed', {
                status: error?.response?.status,
                message: error?.message,
            })
            toast.error(t('adminReports.statusUnavailable'))
        } finally {
            medicalRecordsStatusLoading.value = false
        }
    }

    const getPrescriptionsStatus = async () => {
        if (!aToken.value) return
        prescriptionsStatusLoading.value = true
        try {
            const { data } = await axios.get(backendUrl + '/api/prescriptions/status', {
                headers: { atoken: aToken.value },
            })
            prescriptionsStatus.value = data
        } catch (error) {
            prescriptionsStatus.value = null
            console.error('[prescriptions] status request failed', {
                status: error?.response?.status,
                message: error?.message,
            })
            toast.error(t('adminReports.prescriptionsUnavailable'))
        } finally {
            prescriptionsStatusLoading.value = false
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

    /** Fetch the auditable payment row for one appointment. */
    const getPayment = async (appointmentId) => {
        try {
            const { data } = await axios.get(`${backendUrl}/api/payments/${appointmentId}`, {
                headers: { atoken: aToken.value },
                timeout: 20000,
            })
            return { success: true, payment: data.payment }
        } catch (error) {
            return {
                success: false,
                status: error?.response?.status ?? 0,
                message: toErrorMessage(error, t('paymentDetail.loadError')),
            }
        }
    }

    /** Issue a full or partial refund; timeout keeps the modal recoverable. */
    const refundPayment = async (appointmentId, amount) => {
        try {
            const { data } = await axios.post(
                `${backendUrl}/api/payments/${appointmentId}/refund`,
                { amount },
                { headers: { atoken: aToken.value }, timeout: 30000 },
            )
            return { success: true, payment: data.payment }
        } catch (error) {
            return {
                success: false,
                status: error?.response?.status ?? 0,
                message: toErrorMessage(error, t('paymentDetail.refund.errorGeneric')),
            }
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

    provide(ADMIN_CONTEXT_KEY, {
        aToken,
        backendUrl,
        setAToken,
        doctors,
        reviewCounts,
        getAllDoctors,
        getReviewCounts,
        changeAvailability,
        appointments,
        getAllAppointments,
        cancelAppointment,
        getPayment,
        refundPayment,
        notifications,
        getAllNotifications,
        medicalRecordsStatus,
        medicalRecordsStatusLoading,
        getMedicalRecordsStatus,
        prescriptionsStatus,
        prescriptionsStatusLoading,
        getPrescriptionsStatus,
        dashData,
        getDashData,
        annualReport,
        monthlyTrend,
        reportYear,
        getAnnualReport,
        getMonthlyTrend,
    })
}

export function useAdminContext() {
    return inject(ADMIN_CONTEXT_KEY)
}