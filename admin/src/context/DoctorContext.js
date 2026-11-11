import axios from 'axios'
import { provide, inject, ref } from 'vue'
import { useToast } from 'vue-toastification'

const DOCTOR_CONTEXT_KEY = Symbol('DoctorContext')

export function provideDoctorContext() {
    const toast = useToast()
    const dToken = ref(localStorage.getItem('dToken') || '')
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const appointments = ref([])
    const reviews = ref([])
    const reviewsTotal = ref(0)
    const reviewsLoading = ref(false)
    const reviewsError = ref('')
    let reviewsRequestId = 0
    const dashData = ref([])
    const profileData = ref([])
    const schedulingSuggestions = ref(null)
    const doctorReport = ref(null)
    const doctorTrend = ref([])
    const records = ref([])
    const recordsLoading = ref(false)
    const prescriptions = ref([])
    const prescriptionsLoading = ref(false)
    const setDToken = (token) => {
        // Invalidate in-flight requests and drop the previous doctor's data.
        reviewsRequestId += 1
        reviewsLoading.value = false
        reviews.value = []
        reviewsTotal.value = 0
        reviewsError.value = ''
        dToken.value = token
        if (token) {
            localStorage.setItem('dToken', token)
        } else {
            localStorage.removeItem('dToken')
            records.value = []
            prescriptions.value = []
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

    /**
     * Load one page of the authenticated doctor's reviews.
     * Stale responses from a previous session or request are ignored.
     */
    const getReviews = async (page = 1, pageSize = 10) => {
        if (!dToken.value) {
            reviews.value = []
            reviewsTotal.value = 0
            return
        }
        const requestId = ++reviewsRequestId
        const requestToken = dToken.value
        const isCurrent = () =>
            requestId === reviewsRequestId && requestToken === dToken.value

        reviewsLoading.value = true
        reviewsError.value = ''
        try {
            const { data } = await axios.get(backendUrl + '/api/reviews/doctor/mine', {
                headers: { dtoken: requestToken },
                params: { page, pageSize },
            })
            if (!isCurrent()) return
            if (data?.success) {
                reviews.value = Array.isArray(data.reviews) ? data.reviews : []
                reviewsTotal.value = Number(data.total) || 0
            } else {
                reviewsError.value = data?.message || 'Could not load reviews'
                toast.error(reviewsError.value)
            }
        } catch (error) {
            if (!isCurrent()) return
            reviewsError.value = error?.response?.data?.message ?? error.message
            toast.error(reviewsError.value)
        } finally {
            if (isCurrent()) reviewsLoading.value = false
        }
    }

    const getRecords = async () => {
        if (!dToken.value) {
            records.value = []
            return
        }
        records.value = []
        recordsLoading.value = true
        try {
            const limit = 100
            let offset = 0
            const all = []
            while (true) {
                const { data } = await axios.get(backendUrl + '/api/medical-records/doctor/mine', {
                    headers: { dtoken: dToken.value },
                    params: { limit, offset },
                })
                if (!data?.success) {
                    toast.error(data?.message || 'Could not load medical records')
                    break
                }
                const batch = Array.isArray(data.records) ? data.records : []
                all.push(...batch)
                records.value = [...all]
                if (batch.length < limit) break
                offset += batch.length
            }
        } catch (error) {
            const msg = error?.response?.data?.message ?? error.message
            toast.error(msg)
        } finally {
            recordsLoading.value = false
        }
    }

    const getPrescriptions = async () => {
        if (!dToken.value) {
            prescriptions.value = []
            return false
        }
        prescriptions.value = []
        prescriptionsLoading.value = true
        let ok = true
        try {
            const limit = 100
            let offset = 0
            const all = []
            while (true) {
                const { data } = await axios.get(backendUrl + '/api/prescriptions/doctor/mine', {
                    headers: { dtoken: dToken.value },
                    params: { limit, offset },
                })
                if (!data?.success) {
                    toast.error(data?.message || 'Could not load prescriptions')
                    ok = false
                    break
                }
                const batch = Array.isArray(data.prescriptions) ? data.prescriptions : []
                all.push(...batch)
                prescriptions.value = [...all]
                if (batch.length < limit) break
                offset += batch.length
            }
            return ok
        } catch (error) {
            const msg = error?.response?.data?.message ?? error.message
            toast.error(msg)
            return false
        } finally {
            prescriptionsLoading.value = false
        }
    }

    const issuePrescription = async (payload) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/prescriptions', payload, {
                headers: { dtoken: dToken.value },
            })
            return { ok: true, id: data?.id }
        } catch (error) {
            const message = error?.response?.data?.message
            return {
                ok: false,
                status: error?.response?.status,
                message: Array.isArray(message) ? message.join(' ') : message ?? error.message,
            }
        }
    }

    const revokePrescription = async (id) => {
        try {
            const { data } = await axios.patch(
                backendUrl + `/api/prescriptions/${id}/revoke`,
                {},
                { headers: { dtoken: dToken.value } },
            )
            return {
                ok: true,
                alreadyRevoked: Boolean(data?.alreadyRevoked),
                revokedAt: data?.revokedAt ?? null,
            }
        } catch (error) {
            return {
                ok: false,
                status: error?.response?.status,
                message: error?.response?.data?.message ?? error.message,
            }
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

    const cancelAppointment = async (appointmentId, reason) => {
        try {
            const { data } = await axios.patch(backendUrl + '/api/doctors/cancel-appointment', { appointmentId, reason }, { headers: { dtoken: dToken.value } })
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
            toast.error(error.response?.data?.message ?? error.message)
        }
    }

    const getDoctorAnnualReport = async (year = new Date().getFullYear()) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/reports/doctor/annual', { headers: { dtoken: dToken.value }, params: { year } })
            if (data.success) {
                doctorReport.value = data
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const getDoctorTrend = async (months = 12) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/reports/doctor/trend', { headers: { dtoken: dToken.value }, params: { months } })
            if (data.success) {
                doctorTrend.value = data.trend
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    provide(DOCTOR_CONTEXT_KEY, {
        dToken,
        setDToken,
        backendUrl,
        appointments,
        getAppointments,
        reviews,
        reviewsTotal,
        reviewsLoading,
        reviewsError,
        getReviews,
        records,
        recordsLoading,
        getRecords,
        prescriptions,
        prescriptionsLoading,
        getPrescriptions,
        issuePrescription,
        revokePrescription,
        completeAppointment,
        cancelAppointment,
        dashData,
        getDashData,
        profileData,
        getProfileData,
        updateProfileData,
        schedulingSuggestions,
        getSchedulingSuggestions,
        doctorReport,
        doctorTrend,
        getDoctorAnnualReport,
        getDoctorTrend,
    })
}

export function useDoctorContext() {
    return inject(DOCTOR_CONTEXT_KEY)
}