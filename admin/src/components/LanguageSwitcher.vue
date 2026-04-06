<script setup>
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const { locale } = useI18n()

const isES = computed(() => locale.value === 'es')

const toggle = () => {
    locale.value = isES.value ? 'en' : 'es'
    localStorage.setItem('prescripto_lang', locale.value)
}
</script>

<template>
    <button @click="toggle" :title="isES ? 'Switch to English' : 'Cambiar a Español'" aria-label="Toggle language"
        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-200 cursor-pointer select-none">
        <span class="text-base leading-none" aria-hidden="true">
            {{ isES ? '🇪🇸' : '🇺🇸' }}
        </span>
        <span class="text-xs font-semibold text-slate-600 tracking-wide">
            {{ isES ? 'ES' : 'EN' }}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
    </button>
</template>