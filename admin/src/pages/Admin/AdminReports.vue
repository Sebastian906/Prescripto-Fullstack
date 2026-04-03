<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAdminContext } from '../../context/AdminContext'
import { useAppContext } from '../../context/AppContext'

const { aToken, annualReport, monthlyTrend, getAnnualReport, getMonthlyTrend } = useAdminContext()
const { currency } = useAppContext()

const selectedYear = ref(new Date().getFullYear())
const trendMonths = ref(12)
const loading = ref(false)

/**
 * Visualización de la tabla DP acumulada.
 * Cada fila muestra métricas mensuales + acumulados rolling.
 * El frontend no hace cálculos — consume la tabla ya tabulada del backend.
 */
const reportRows = computed(() => annualReport.value?.report ?? [])
const totals = computed(() => annualReport.value?.totals ?? {})

const completionRate = computed(() => {
    const t = totals.value
    if (!t.totalAppointments) return 0
    return Math.round((t.completedAppointments / t.totalAppointments) * 100)
})

const loadData = async () => {
    loading.value = true
    await Promise.all([
        getAnnualReport(selectedYear.value),
        getMonthlyTrend(trendMonths.value),
    ])
    loading.value = false
}

const maxAppointments = computed(() =>
    Math.max(...monthlyTrend.value.map(p => p.appointments), 1)
)

onMounted(() => {
    if (aToken.value) loadData()
})
</script>

<template>
    <div class="m-5 w-full max-w-6xl">
        <div class="flex items-center justify-between mb-6">
            <p class="text-lg font-medium text-gray-700">Annual Reports</p>
            <div class="flex items-center gap-3">
                <select v-model="selectedYear" @change="loadData"
                    class="border rounded px-3 py-1.5 text-sm text-slate-600 focus:outline-indigo-400">
                    <option v-for="y in [2025, 2026, 2027]" :key="y" :value="y">{{ y }}</option>
                </select>
                <button @click="loadData" class="text-xs text-indigo-500 hover:underline cursor-pointer">
                    Refresh
                </button>
            </div>
        </div>

        <div v-if="totals.totalAppointments !== undefined" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div class="bg-white rounded-lg border p-4">
                <p class="text-xs text-slate-400 uppercase">Total Appointments</p>
                <p class="text-2xl font-semibold text-slate-700 mt-1">{{ totals.totalAppointments }}</p>
            </div>
            <div class="bg-white rounded-lg border p-4">
                <p class="text-xs text-slate-400 uppercase">Completed</p>
                <p class="text-2xl font-semibold text-green-600 mt-1">{{ totals.completedAppointments }}</p>
            </div>
            <div class="bg-white rounded-lg border p-4">
                <p class="text-xs text-slate-400 uppercase">Cancelled</p>
                <p class="text-2xl font-semibold text-red-500 mt-1">{{ totals.cancelledAppointments }}</p>
            </div>
            <div class="bg-white rounded-lg border p-4">
                <p class="text-xs text-slate-400 uppercase">Total Earnings</p>
                <p class="text-2xl font-semibold text-indigo-600 mt-1">{{ currency }}{{
                    totals.totalEarnings?.toLocaleString() }}</p>
            </div>
        </div>

        <p class="text-lg font-medium text-slate-600 pb-4">
            Monthly Breakdown — {{ selectedYear }}
            <span class="text-xs text-slate-400 ml-2">(Showing Appointment Stats)</span>
        </p>

        <div class="bg-slate-100 rounded-lg border overflow-hidden mb-6">
            <div v-if="loading" class="text-center py-10 text-slate-400 text-sm animate-pulse">
                Loading report…
            </div>

            <table v-else class="w-full text-sm text-gray-600">
                <thead>
                    <tr class="border-b text-xs text-gray-600 uppercase bg-slate-200">
                        <th class="py-3 px-6 text-left">Month</th>
                        <th class="py-3 px-4 text-right">Appts</th>
                        <th class="py-3 px-4 text-right">Completed</th>
                        <th class="py-3 px-4 text-right">Cancelled</th>
                        <th class="py-3 px-4 text-right">Earnings</th>
                        <th class="py-3 px-4 text-right">Patients</th>
                        <th class="py-3 px-4 text-right">Cumul. Earnings</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in reportRows" :key="row.month" class="border-b hover:bg-indigo-50 transition-colors"
                        :class="{ 'bg-indigo-50/40': row.totalAppointments > 0 }">
                        <td class="py-3 px-6 font-medium">{{ row.monthLabel }}</td>
                        <td class="py-3 px-4 text-right">{{ row.totalAppointments || '—' }}</td>
                        <td class="py-3 px-4 text-right text-green-600">{{ row.completedAppointments || '—' }}</td>
                        <td class="py-3 px-4 text-right text-red-400">{{ row.cancelledAppointments || '—' }}</td>
                        <td class="py-3 px-4 text-right">
                            {{ row.earnings ? currency + row.earnings.toLocaleString() : '—' }}
                        </td>
                        <td class="py-3 px-4 text-right">{{ row.uniquePatients || '—' }}</td>
                        <td class="py-3 px-4 text-right text-indigo-600 font-medium">
                            {{ row.cumulativeEarnings ? currency + row.cumulativeEarnings.toLocaleString() : '—' }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="bg-slate-100 rounded-lg border p-6">
            <div class="flex items-center justify-between mb-4">
                <p class="text-sm font-medium text-slate-600">Monthly Trend</p>
                <select v-model="trendMonths" @change="getMonthlyTrend(trendMonths)"
                    class="border rounded px-2 py-1 text-xs text-slate-600">
                    <option :value="6">Last 6 months</option>
                    <option :value="12">Last 12 months</option>
                    <option :value="24">Last 24 months</option>
                </select>
            </div>

            <div class="flex items-end gap-1 h-32">
                <div v-for="point in monthlyTrend" :key="point.label" class="flex-1 flex flex-col items-center gap-1">
                    <div class="w-full bg-indigo-400 rounded-t-sm transition-all duration-500" :style="{
                        height: maxAppointments > 0
                            ? `${(point.appointments / maxAppointments) * 100}px`
                            : '2px'
                    }" :title="`${point.label}: ${point.appointments} appts, ${currency}${point.earnings}`" />
                    <p class="text-[9px] text-slate-400 rotate-45 origin-left whitespace-nowrap">
                        {{ point.label.slice(0, 3) }}
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>