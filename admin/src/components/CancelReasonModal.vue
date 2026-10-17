<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
    open: { type: Boolean, default: false },
    reason: { type: String, default: '' },
})
const emit = defineEmits(['confirm', 'close', 'update:reason'])
const { t } = useI18n()
</script>

<template>
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div class="w-96 rounded-lg bg-white p-5 shadow-lg">
            <p class="mb-2 font-medium text-gray-800">{{ t('cancelReason.title') }}</p>
            <textarea :value="reason" @input="emit('update:reason', $event.target.value)" rows="3" maxlength="300"
                class="w-full rounded border p-2 text-sm text-gray-700"
                :placeholder="t('cancelReason.placeholder')"></textarea>
            <div class="mt-4 flex justify-end gap-2">
                <button @click="emit('close')"
                    class="cursor-pointer rounded border px-3 py-1.5 text-sm text-slate-600">
                    {{ t('cancelReason.dismiss') }}
                </button>
                <button @click="emit('confirm')"
                    class="cursor-pointer rounded bg-red-500 px-3 py-1.5 text-sm text-white">
                    {{ t('cancelReason.confirm') }}
                </button>
            </div>
        </div>
    </div>
</template>