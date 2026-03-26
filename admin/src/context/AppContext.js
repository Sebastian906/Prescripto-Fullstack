import { provide, inject } from 'vue'

const APP_CONTEXT_KEY = Symbol('AppContext')

export function provideAppContext() {
    const currency = '$'

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const calculateAge = (dob) => {
        if (!dob || dob === 'Not Selected') return '—'
        const today = new Date()
        const birthDate = new Date(dob)
        return today.getFullYear() - birthDate.getFullYear()
    }

    const slotDateFormat = (slotDate) => {
        if (!slotDate) return ''
        const [day, month, year] = slotDate.split('/')
        return `${day} ${months[Number(month) - 1]} ${year}`
    }

    provide(APP_CONTEXT_KEY, {
        currency,
        calculateAge,
        slotDateFormat,
    })
}

export function useAppContext() {
    return inject(APP_CONTEXT_KEY)
}