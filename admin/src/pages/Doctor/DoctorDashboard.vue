<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDoctorContext } from '../../context/DoctorContext'
import { useAppContext } from '../../context/AppContext'
import { assets } from '../../assets/assets'

const { dToken, dashData, getDashData, completeAppointment, cancelAppointment, schedulingSuggestions, getSchedulingSuggestions } = useDoctorContext()
const { currency, slotDateFormat } = useAppContext()
const { t } = useI18n()

const statCards = computed(() => [
    { key: 'earnings', label: t('doctorDashboard.earnings'), icon: assets.earning_icon, prefix: currency },
    { key: 'appointments', label: t('doctorDashboard.appointments'), icon: assets.appointments_icon, prefix: '' },
    { key: 'patients', label: t('doctorDashboard.patients'), icon: assets.patients_icon, prefix: '' },
])

const selectedPriority = ref('normal')
const loadingSlots = ref(false)

const next7Dates = computed(() => {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() + i)
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
    })
})

const priorityOptions = computed(() => [
    { value: 'urgent', label: t('doctorDashboard.urgent') },
    { value: 'normal', label: t('doctorDashboard.normal') },
    { value: 'flexible', label: t('doctorDashboard.flexible') },
])

const fetchSuggestions = async () => {
    loadingSlots.value = true
    await getSchedulingSuggestions(next7Dates.value, selectedPriority.value)
    loadingSlots.value = false
}

onMounted(() => {
    if (dToken.value) {
        getDashData()
        fetchSuggestions()
    }
})
</script>

<template>
    <div v-if="dashData" class="m-5">
        <div class="flex flex-wrap gap-3">
            <div v-for="card in statCards" :key="card.key"
                class="flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-200 cursor-pointer hover:scale-105 transition-all">
                <img class="w-14" :src="card.icon" :alt="card.label" />
                <div>
                    <p class="text-xl font-semibold text-gray-600">
                        {{ card.prefix }}{{ dashData[card.key] }}
                    </p>
                    <p class="text-sm text-gray-400 underline">{{ card.label }}</p>
                </div>
            </div>
        </div>

        <div class="bg-slate-100 mt-10 rounded border">
            <div class="flex items-center gap-2.5 px-4 py-4 border-b">
                <img :src="assets.list_icon" alt="" />
                <p class="font-semibold">{{ t('doctorDashboard.latestBookings') }}</p>
            </div>
            <div>
                <div v-for="(item, index) in dashData.latestAppointments" :key="item._id ?? index"
                    class="flex items-center px-6 py-3 gap-3 hover:bg-gray-200 transition-colors">
                    <img class="rounded-full w-10 h-10 object-cover bg-gray-200" :src="item.userData.image"
                        :alt="item.userData.name" />
                    <div class="flex-1 text-sm">
                        <p class="text-gray-800 font-medium">{{ item.userData.name }}</p>
                        <p class="text-gray-500">{{ slotDateFormat(item.slotDate) }}</p>
                    </div>
                    <p v-if="item.cancelled" class="text-red-500 text-xs font-medium">{{ t('doctorDashboard.cancelled')
                    }}</p>
                    <p v-else-if="item.isCompleted" class="text-green-500 text-xs font-medium">{{
                        t('doctorDashboard.completed') }}</p>
                    <template v-else>
                        <img @click="cancelAppointment(item._id)" class="w-10 cursor-pointer" :src="assets.cancel_icon"
                            alt="Cancel" :title="t('doctorDashboard.cancelAppointment')" />
                        <img @click="completeAppointment(item._id)" class="w-10 cursor-pointer" :src="assets.tick_icon"
                            alt="Complete" :title="t('doctorDashboard.markCompleted')" />
                    </template>
                </div>
            </div>
        </div>
        <div class="bg-slate-100 mt-8 rounded border">
            <div class="flex items-center justify-between px-4 py-4 border-b">
                <div class="flex items-center gap-2.5">
                    <img :src="assets.appointment_icon" alt="" class="w-5" />
                    <p class="font-semibold text-gray-700">{{ t('doctorDashboard.schedulingInsights') }}</p>
                </div>
                <div class="flex items-center gap-2">
                    <select v-model="selectedPriority" @change="fetchSuggestions"
                        class="text-xs border border-slate-500 rounded px-2 py-1 text-slate-600 bg-slate-50 cursor-pointer">
                        <option v-for="opt in priorityOptions" :key="opt.value" :value="opt.value">
                            {{ opt.label }}
                        </option>
                    </select>
                    <button @click="fetchSuggestions" class="text-xs text-indigo-500 hover:underline cursor-pointer">
                        {{ t('doctorDashboard.refresh') }}
                    </button>
                </div>
            </div>

            <div v-if="loadingSlots" class="px-4 py-6 text-sm text-slate-400 animate-pulse text-center">
                {{ t('doctorDashboard.analysing') }}
            </div>

            <div v-else-if="schedulingSuggestions?.suggestions?.length > 0" class="px-4 py-3">
                <p v-if="schedulingSuggestions.isIdeal" class="text-xs text-indigo-500 font-medium mb-3">
                    {{ t('doctorDashboard.correct') }} {{ schedulingSuggestions.reason }}
                </p>
                <p v-else class="text-xs text-amber-500 font-medium mb-3">
                    {{ t('doctorDashboard.warning') }} {{ schedulingSuggestions.reason }}
                </p>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div v-for="(s, i) in schedulingSuggestions.suggestions" :key="i" :class="[
                        'rounded-lg border p-3 text-sm transition-colors',
                        i === 0
                            ? 'border-indigo-400 bg-indigo-50'
                            : 'border-slate-200 bg-slate-50'
                    ]">
                        <div class="flex items-center gap-1 font-medium text-slate-700 mb-1">
                            <span v-if="i === 0">{{ t('doctorDashboard.time') }}</span>
                            <span>{{ slotDateFormat(s.slotDate) }} · {{ s.slotTime }}</span>
                        </div>
                        <div class="flex items-center gap-3 text-xs text-slate-500">
                            <span>{{ t('doctorDashboard.load') }}: {{ s.doctorLoad }} {{ t('doctorDashboard.appts')
                            }}</span>
                            <span>{{ t('doctorDashboard.gap') }}: {{ s.gapMinutes }}{{ t('doctorDashboard.min')
                            }}</span>
                        </div>
                        <div class="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div class="h-full rounded-full bg-indigo-400 transition-all"
                                :style="{ width: `${Math.min(Math.max((s.score + 5) * 7, 10), 100)}%` }" />
                        </div>
                    </div>
                </div>
            </div>

            <div v-else class="px-4 py-6 text-sm text-slate-400 text-center">
                {{ t('doctorDashboard.noSlots') }}
            </div>
        </div>
    </div>
    <div v-else class="flex items-center justify-center h-64 text-slate-400 text-sm">
        {{ t('doctorDashboard.loading') }}
    </div>
</template>