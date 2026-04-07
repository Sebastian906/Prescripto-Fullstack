<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDoctorContext } from '../../context/DoctorContext'
import { useAppContext } from '../../context/AppContext'

const { t } = useI18n()
const { dToken, doctorReport, doctorTrend, getDoctorAnnualReport, getDoctorTrend } = useDoctorContext()
const { currency } = useAppContext()

const selectedYear = ref(new Date().getFullYear())
const loading = ref(false)

const report = computed(() => doctorReport.value?.report ?? [])
const totals = computed(() => doctorReport.value?.totals ?? {})
const maxEarnings = computed(() =>
    Math.max(...doctorTrend.value.map(p => p.earnings), 1)
)

const loadData = async () => {
    loading.value = true
    await Promise.all([
        getDoctorAnnualReport(selectedYear.value),
        getDoctorTrend(12),
    ])
    loading.value = false
}

onMounted(() => {
    if (dToken.value) loadData()
})
</script>

<template>
    <div class="m-5 w-full max-w-4xl">
        <div class="flex items-center justify-between mb-5">
            <p class="text-lg font-medium text-gray-700">{{ t('doctorReports.title') }}</p>
            <select v-model="selectedYear" @change="loadData" class="border rounded px-3 py-1.5 text-sm text-slate-600">
                <option v-for="y in [2024, 2025, 2026]" :key="y" :value="y">{{ y }}</option>
            </select>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div class="bg-indigo-50 rounded-lg border border-indigo-200 p-4">
                <p class="text-xs text-indigo-400 uppercase">{{ t('doctorReports.appointments') }}</p>
                <p class="text-xl font-semibold text-indigo-700 mt-1">{{ totals.totalAppointments ?? 0 }}</p>
            </div>
            <div class="bg-green-50 rounded-lg border border-green-200 p-4">
                <p class="text-xs text-green-400 uppercase">{{ t('doctorReports.completed') }}</p>
                <p class="text-xl font-semibold text-green-700 mt-1">{{ totals.completedAppointments ?? 0 }}</p>
            </div>
            <div class="bg-red-50 rounded-lg border border-red-200 p-4">
                <p class="text-xs text-red-400 uppercase">{{ t('doctorReports.cancelled') }}</p>
                <p class="text-xl font-semibold text-red-600 mt-1">{{ totals.cancelledAppointments ?? 0 }}</p>
            </div>
            <div class="bg-white rounded-lg border p-4">
                <p class="text-xs text-slate-400 uppercase">{{ t('doctorReports.earnings') }}</p>
                <p class="text-xl font-semibold text-slate-700 mt-1">{{ currency }}{{
                    totals.totalEarnings?.toLocaleString() ?? 0 }}</p>
            </div>
        </div>

        <div class="bg-slate-100 rounded-lg border overflow-hidden mb-5">
            <table class="w-full text-sm text-gray-600">
                <thead>
                    <tr class="border-b text-xs text-gray-600 uppercase bg-slate-200">
                        <th class="py-3 px-4 text-left">{{ t('doctorReports.month') }}</th>
                        <th class="py-3 px-4 text-right">{{ t('doctorReports.appts') }}</th>
                        <th class="py-3 px-4 text-right">{{ t('doctorReports.done') }}</th>
                        <th class="py-3 px-4 text-right">{{ t('doctorReports.earnings') }}</th>
                        <th class="py-3 px-4 text-right">{{ t('doctorReports.cumulative') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in report" :key="row.month" class="border-b hover:bg-indigo-50 transition-colors">
                        <td class="py-2.5 px-4 font-medium">{{ row.monthLabel }}</td>
                        <td class="py-2.5 px-4 text-right">{{ row.totalAppointments || '—' }}</td>
                        <td class="py-2.5 px-4 text-right text-green-600">{{ row.completedAppointments || '—' }}</td>
                        <td class="py-2.5 px-4 text-right">
                            {{ row.earnings ? currency + row.earnings.toLocaleString() : '—' }}
                        </td>
                        <td class="py-2.5 px-4 text-right">
                            <div class="flex items-center justify-end gap-2">
                                <div class="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div class="h-full bg-indigo-400 rounded-full" :style="{
                                        width: totals.totalEarnings > 0
                                            ? `${Math.min((row.cumulativeEarnings / totals.totalEarnings) * 100, 100)}%`
                                            : '0%'
                                    }" />
                                </div>
                                <span class="text-indigo-600 font-medium text-xs">
                                    {{ currency }}{{ row.cumulativeEarnings?.toLocaleString() ?? 0 }}
                                </span>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="bg-slate-100 rounded-lg border p-5">
            <p class="text-sm font-medium text-slate-600 mb-4">{{ t('doctorReports.earningsTrend') }}</p>
            <div class="flex items-end gap-1 h-24">
                <div v-for="point in doctorTrend" :key="point.label" class="flex-1 flex flex-col items-center">
                    <div class="w-full bg-indigo-400 rounded-t-sm" :style="{
                        height: `${(point.earnings / maxEarnings) * 80}px`,
                        minHeight: point.earnings > 0 ? '3px' : '0'
                    }" :title="`${point.label}: ${currency}${point.earnings}`" />
                </div>
            </div>
        </div>
    </div>
</template>