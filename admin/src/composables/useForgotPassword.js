import { ref } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toastification'

export function useForgotPassword(backendUrl) {
    const toast = useToast()

    const show = ref(false)
    const email = ref('')
    const newPassword = ref('')
    const confirmPassword = ref('')
    const showNewPassword = ref(false)
    const loading = ref(false)
    const done = ref(false)
    const role = ref('doctor')

    const open = (selectedRole = 'doctor') => {
        role.value = selectedRole
        email.value = ''
        newPassword.value = ''
        confirmPassword.value = ''
        done.value = false
        showNewPassword.value = false
        show.value = true
    }

    const close = () => { show.value = false }

    const validate = () => {
        if (!email.value) {
            toast.error('Please enter your email')
            return false
        }
        if (newPassword.value.length < 8) {
            toast.error('Password must be at least 8 characters')
            return false
        }
        if (newPassword.value !== confirmPassword.value) {
            toast.error('Passwords do not match')
            return false
        }
        return true
    }

    const submit = async () => {
        if (!validate()) return
        loading.value = true
        try {
            const { data } = await axios.post(backendUrl + '/api/auth/direct-reset-password', { email: email.value, role: role.value, newPassword: newPassword.value })
            if (data.success) {
                done.value = true
            } else {
                toast.error(data.message ?? 'Something went wrong')
            }
        } catch (err) {
            toast.error(err?.response?.data?.message ?? err.message)
        } finally {
            loading.value = false
        }
    }

    return { show, email, newPassword, confirmPassword, showNewPassword, loading, done, role, open, close, submit }
}