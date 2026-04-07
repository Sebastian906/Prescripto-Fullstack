<script setup>
import { ref } from 'vue'
import { useAdminContext } from '../context/AdminContext'
import { useToast } from 'vue-toastification'
import axios from 'axios'
import { useDoctorContext } from '../context/DoctorContext'
import ForgotPasswordModal from '../components/ForgotPasswordModal.vue'
import { useForgotPassword } from '../composables/useForgotPassword'
import { useI18n } from 'vue-i18n'

const state = ref('Admin')
const email = ref('')
const password = ref('')

const { setAToken, backendUrl } = useAdminContext()
const { setDToken } = useDoctorContext()
const forgot = useForgotPassword(backendUrl)
const toast = useToast()
const { t } = useI18n()

const onSubmitHandler = async (event) => {
    event.preventDefault()
    try {
        if (state.value === 'Admin') {
            const { data } = await axios.post(backendUrl + '/api/admin/login', { email: email.value, password: password.value })
            if (data.success) {
                setAToken(data.token)
                toast.success(t('login.title'))
            } else {
                toast.error(t('adminLogin.invalidCredentials'))
            }
        } else {
            const { data } = await axios.post(backendUrl + '/api/doctors/login', { email: email.value, password: password.value })
            if (data.success) {
                setDToken(data.token)
                toast.success(t('login.title'))
            } else {
                toast.error(t('adminLogin.invalidCredentials'))
            }
        }
    } catch (error) {
        toast.error(t('adminLogin.errorOccurred'))
        console.error(error)
    }
}
</script>

<template>
    <form @submit="onSubmitHandler" class="min-h-[80vh] flex items-center">
        <div
            class="flex flex-col gap-3 m-auto items-start p-8 min-w-85 sm:min-w-96 border rounded-xl text-[#5e5e5e] text-sm shadow-lg">
            <p class="text-2xl font-semibold m-auto">
                <span class="text-indigo-500"> {{ state }} </span> {{ $t('adminLogin.title') }}
            </p>
            <div class="w-full">
                <p>{{ $t('adminLogin.email') }}</p>
                <input v-model="email" class="border border-[#dadada] rounded w-full p-2 mt-1" type="email" required />
            </div>
            <div class="w-full">
                <p>{{ $t('adminLogin.password') }}</p>
                <input v-model="password" class="border border-[#dadada] rounded w-full p-2 mt-1" type="password"
                    required />
            </div>
            <div class="text-left">
                <button type="button" @click="forgot.open(state === 'Admin' ? 'admin' : 'doctor')"
                    class="text-sm text-slate-500 hover:text-indigo-500 transition-colors cursor-pointer bg-transparent border-none p-0">
                    {{ $t('adminLogin.forgotPassword') }}
                </button>
            </div>
            <button class="bg-indigo-500 text-slate-50 w-full py-2 rounded-md text-base cursor-pointer">
                {{ $t('adminLogin.loginBtn') }}
            </button>
            <p v-if="state === 'Admin'">
                {{ $t('adminLogin.doctorLogin') }}
                <span class="text-indigo-500 underline cursor-pointer" @click="state = 'Doctor'">
                    {{ $t('adminLogin.clickHere') }}
                </span>
            </p>
            <p v-else>
                {{ $t('adminLogin.adminLogin') }}
                <span class="text-indigo-500 underline cursor-pointer" @click="state = 'Admin'">
                    {{ $t('adminLogin.clickHere') }}
                </span>
            </p>
        </div>
        <ForgotPasswordModal :model-value="forgot" />
    </form>
</template>