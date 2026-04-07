<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()

const backendUrl = import.meta.env.VITE_BACKEND_URL
const token = computed(() => route.query.token ?? '')

const newPassword = ref('')
const confirmPassword = ref('')
const showNew = ref(false)
const loading = ref(false)
const done = ref(false)

const validate = () => {
    if (newPassword.value.length < 8) {
        toast.error(t('resetPassword.passwordTooShort'))
        return false
    }
    if (newPassword.value !== confirmPassword.value) {
        toast.error(t('resetPassword.passwordMismatch'))
        return false
    }
    return true
}

const handleSubmit = async () => {
    if (!validate()) return
    loading.value = true
    try {
        const { data } = await axios.post(backendUrl + '/api/auth/reset-password', {
            token: token.value,
            newPassword: newPassword.value,
        })
        if (data.success) {
            done.value = true
            toast.success(t('forgotPasswordModal.successTitle'))
            setTimeout(() => router.push('/'), 2500)
        } else {
            toast.error(data.message ?? t('resetPassword.somethingWrong'))
        }
    } catch (err) {
        toast.error(err?.response?.data?.message ?? err.message)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    if (!token.value) {
        toast.error(t('resetPassword.invalid'))
        router.push('/')
    }
})
</script>

<template>
    <div class="flex items-center justify-center min-h-screen bg-indigo-100">
        <div class="bg-white rounded-2xl shadow-xl px-10 py-10 w-full max-w-md mx-4">
            <h1 class="text-3xl font-semibold text-slate-800 text-center mb-1">{{ $t('resetPassword.title') }}</h1>
            <p class="text-sm text-slate-500 text-center mb-7">{{ $t('resetPassword.subtitle') }}</p>

            <div v-if="done" class="text-center text-green-600 font-medium py-4">
                {{ $t('resetPassword.success') }}
            </div>

            <form v-else @submit.prevent="handleSubmit" class="flex flex-col gap-5">
                <div class="relative">
                    <input v-model="newPassword" :type="showNew ? 'text' : 'password'"
                        :placeholder="$t('resetPassword.newPassword')" required
                        class="w-full py-3.5 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 placeholder:text-slate-400" />
                    <button type="button" @click="showNew = !showNew"
                        class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        tabindex="-1">
                        <svg v-if="showNew" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                </div>

                <div class="relative">
                    <input v-model="confirmPassword" type="password" :placeholder="$t('resetPassword.confirmPassword')"
                        required
                        class="w-full py-3.5 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 placeholder:text-slate-400" />
                    <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </span>
                </div>

                <button type="submit" :disabled="loading"
                    class="w-full h-12 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white rounded-lg font-semibold text-base transition-colors shadow-md cursor-pointer">
                    {{ loading ? $t('resetPassword.updating') : $t('resetPassword.update') }}
                </button>
            </form>
        </div>
    </div>
</template>