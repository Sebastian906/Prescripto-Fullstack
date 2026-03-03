import { provide, inject, ref } from 'vue'
import { useToast } from 'vue-toastification'
import axios from 'axios'

const ADMIN_CONTEXT_KEY = Symbol('AdminContext')

export function provideAdminContext() {
    const toast = useToast()

    const aToken = ref(
        localStorage.getItem('aToken') || ''
    )
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const doctors = ref([])

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
            const { data } = await axios.get(
                backendUrl + '/api/admin/all-doctors',
                { headers: { atoken: aToken.value } },
            )
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
            const { data } = await axios.patch(
                `${backendUrl}/api/doctors/change-availability/${docId}`,
                {},
                { headers: { atoken: aToken.value } },
            )
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

    provide(ADMIN_CONTEXT_KEY, { aToken, backendUrl, setAToken, doctors, getAllDoctors, changeAvailability })
}

export function useAdminContext() {
    return inject(ADMIN_CONTEXT_KEY)
}