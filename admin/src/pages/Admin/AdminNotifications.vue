<script setup>
import { onMounted } from 'vue'
import { useAdminContext } from '../../context/AdminContext'
import { useI18n } from 'vue-i18n'

const { aToken, notifications, getAllNotifications } = useAdminContext()
const { t } = useI18n()

// Solo mostramos sufijo del ObjectId: la fila lleva IDs + timestamps, sin datos del paciente.
const shortId = (id) => (typeof id === 'string' ? `…${id.slice(-6)}` : '—')

onMounted(() => {
    if (aToken.value) {
        getAllNotifications()
    }
})
</script>

<template>
    <div class="w-full max-w-6xl m-5">
        <div class="flex items-center justify-between mb-3">
            <p class="text-lg font-medium">{{ t('notifications.title') }}</p>
            <button @click="getAllNotifications"
                class="text-sm px-3 py-1.5 rounded border text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
                {{ t('notifications.refresh') }}
            </button>
        </div>
        <div class="bg-slate-50 border rounded text-sm">
            <div
                class="hidden sm:grid grid-cols-[1.5fr_2fr_2fr_2fr_1fr] py-3 px-6 border-b font-medium text-gray-600">
                <p>{{ t('notifications.typeLabel') }}</p>
                <p>{{ t('notifications.appointment') }}</p>
                <p>{{ t('notifications.doctor') }}</p>
                <p>{{ t('notifications.when') }}</p>
                <p>{{ t('notifications.status') }}</p>
            </div>

            <div v-for="n in notifications" :key="n._id"
                class="grid grid-cols-2 sm:grid-cols-[1.5fr_2fr_2fr_2fr_1fr] gap-2 sm:gap-0 items-center text-gray-600 py-3 px-6 border-b hover:bg-gray-100">
                <p class="font-medium text-neutral-700">{{ t(`notifications.type.${n.type}`) }}</p>
                <p class="font-mono text-xs">{{ shortId(n.data?.appointmentId) }}</p>
                <p class="font-mono text-xs max-sm:hidden">{{ shortId(n.data?.doctorId) }}</p>
                <p>{{ new Date(n.createdAt).toLocaleString() }}</p>
                <p :class="n.readAt ? 'text-slate-400' : 'text-indigo-600 font-medium'">
                    {{ n.readAt ? t('notifications.read') : t('notifications.unread') }}
                </p>
            </div>

            <p v-if="notifications.length === 0" class="text-center text-slate-400 py-16">
                {{ t('notifications.empty') }}
            </p>
        </div>
    </div>
</template>