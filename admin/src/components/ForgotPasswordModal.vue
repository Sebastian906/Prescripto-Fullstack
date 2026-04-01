<script setup>
defineProps({
    modelValue: { type: Object, required: true },
})
</script>

<template>
    <div
        v-if="modelValue.show.value"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        @click="modelValue.close()"
    >
        <div
            class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4 relative"
            @click.stop
        >
            <button
                @click="modelValue.close()"
                class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <h2 class="text-2xl font-semibold text-slate-800 mb-1">Reset Password</h2>
            <p class="text-sm text-slate-500 mb-6">
                Enter your email and new password.
            </p>

            <div v-if="modelValue.done.value" class="text-center py-4">
                <p class="text-green-500 font-semibold text-base mb-2">✓ Password updated!</p>
                <p class="text-sm text-slate-600 mb-5">You can now log in with your new password.</p>
                <button
                    @click="modelValue.close()"
                    class="w-full h-11 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition-colors cursor-pointer"
                >
                    Back to Login
                </button>
            </div>

            <form v-else @submit.prevent="modelValue.submit()" class="flex flex-col gap-4">
                <div class="relative">
                    <input
                        v-model="modelValue.email.value"
                        type="email"
                        placeholder="Email address"
                        required
                        class="w-full py-3 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 placeholder:text-slate-400"
                    />
                    <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </span>
                </div>

                <div class="relative">
                    <input
                        v-model="modelValue.newPassword.value"
                        :type="modelValue.showNewPassword.value ? 'text' : 'password'"
                        placeholder="New password"
                        required
                        class="w-full py-3 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 placeholder:text-slate-400"
                    />
                    <button
                        type="button"
                        @click="modelValue.showNewPassword.value = !modelValue.showNewPassword.value"
                        class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        tabindex="-1"
                    >
                        <svg v-if="modelValue.showNewPassword.value" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                </div>

                <div class="relative">
                    <input
                        v-model="modelValue.confirmPassword.value"
                        type="password"
                        placeholder="Confirm new password"
                        required
                        class="w-full py-3 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 placeholder:text-slate-400"
                    />
                    <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </span>
                </div>

                <button
                    type="submit"
                    :disabled="modelValue.loading.value"
                    class="w-full h-11 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white rounded-lg font-semibold transition-colors shadow-md cursor-pointer"
                >
                    {{ modelValue.loading.value ? 'Updating…' : 'Update Password' }}
                </button>
            </form>
        </div>
    </div>
</template>