<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminContext } from '../../context/AdminContext'
import { useAppContext } from '../../context/AppContext'
import ReportExportButtons from '../../components/ReportExportButtons.vue'

const {
    aToken,
    backendUrl,
    annualReport,
    monthlyTrend,
    doctors,
    getAllDoctors,
    getAnnualReport,
    getMonthlyTrend,
    medicalRecordsStatus,
    medicalRecordsStatusLoading,
    getMedicalRecordsStatus,
    prescriptionsStatus,
    prescriptionsStatusLoading,
    getPrescriptionsStatus,
} = useAdminContext()
const { currency } = useAppContext()
const { t, locale } = useI18n()

const selectedYear = ref(new Date().getFullYear())
const selectedDocId = ref('')
const trendMonths = ref(12)
const loading = ref(false)
const annualLoading = ref(false)
const trendLoading = ref(false)
const annualFailed = ref(false)
const trendFailed = ref(false)
const failed = computed(() => annualFailed.value || trendFailed.value)

/**
 * Visualización de la tabla DP acumulada.
 * Cada fila muestra métricas mensuales + acumulados rolling.
 * El frontend no hace cálculos — consume la tabla ya tabulada del backend.
 */
const reportRows = computed(() => annualReport.value?.report ?? [])
const totals = computed(() => annualReport.value?.totals ?? {})

/**
 * Definición única de columnas: alimenta <thead>, <tbody> y el CSV.
 * Así el archivo descargado no puede divergir de la tabla visible.
 */
const tableColumns = computed(() => [
    { key: 'month', label: t('adminReports.month'), align: 'text-left', cell: 'px-6 font-medium', value: (r) => r.monthLabel },
    { key: 'appts', label: t('adminReports.appts'), align: 'text-right', cell: 'px-4', value: (r) => r.totalAppointments || '-', csv: (r) => r.totalAppointments ?? 0 },
    { key: 'done', label: t('adminReports.done'), align: 'text-right', cell: 'px-4 text-green-600', value: (r) => r.completedAppointments || '-' },
    { key: 'cancelled', label: t('adminReports.cancelled'), align: 'text-right', cell: 'px-4 text-red-400', value: (r) => r.cancelledAppointments || '-' },
    { key: 'earnings', label: t('adminReports.earnings'), align: 'text-right', cell: 'px-4', value: (r) => (r.earnings ? currency + r.earnings.toLocaleString() : '-') },
    { key: 'patients', label: t('adminReports.patients'), align: 'text-right', cell: 'px-4', value: (r) => r.uniquePatients || '-' },
    { key: 'cumulative', label: t('adminReports.cumulativeEarnings'), align: 'text-right', cell: 'px-4 text-indigo-600 font-medium', value: (r) => (r.cumulativeEarnings ? currency + r.cumulativeEarnings.toLocaleString() : '-') },
])

const csvPayload = computed(() => ({
    header: tableColumns.value.map((col) => col.label),
    rows: reportRows.value.map((row) => tableColumns.value.map((col) => (col.csv ?? col.value)(row))),
    filename: `annual-report-${selectedYear.value}${selectedDocId.value ? '-' + selectedDocId.value : ''}.csv`,
}))

const BAR_PX = 96
const barHeight = (max, value) => {
    if (!value) return '2px'
    return `${Math.max(Math.round(Math.min(value / max, 1) * BAR_PX), 3)}px`
}

/**
 * 3 series desde /api/reports/trend (trailing, no año calendario).
 * Prescripto no persiste capacidad de cupos: "ocupación" = completadas / agendadas.
 */
const trendSeries = computed(() => [
    {
        key: 'occupancy',
        title: t('adminReports.occupancyTitle'),
        hint: t('adminReports.occupancyHint'),
        bar: 'bg-indigo-400',
        max: 100,
        value: (p) => p.completionRate ?? 0,
        display: (v) => `${v}%`,
    },
    {
        key: 'cancellation',
        title: t('adminReports.cancellationTitle'),
        hint: t('adminReports.cancellationHint'),
        bar: 'bg-red-400',
        max: 100,
        value: (p) => p.cancellationRate ?? 0,
        display: (v) => `${v}%`,
    },
    {
        key: 'earnings',
        title: t('adminReports.earningsTitle'),
        hint: t('adminReports.earningsHint'),
        bar: 'bg-emerald-400',
        max: Math.max(...monthlyTrend.value.map((p) => p.earnings ?? 0), 1),
        value: (p) => p.earnings ?? 0,
        display: (v) => `${currency}${Number(v).toLocaleString()}`,
    },
])

const hasSeries = (series) =>
    monthlyTrend.value.some((p) =>
        series.key === 'earnings' ? p.earnings > 0 : p.appointments > 0,
    )

const migratedAtLabel = computed(() => {
    const value = medicalRecordsStatus.value?.migratedAt
    if (!value) return t('adminReports.never')
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? t('adminReports.never') : date.toLocaleString(locale.value)
})

const latestPrescriptionLabel = computed(() => {
    const value = prescriptionsStatus.value?.latestIssuedAt
    if (!value) return t('adminReports.never')
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? t('adminReports.never') : date.toLocaleString(locale.value)
})

let annualSeq = 0
let trendSeq = 0

const loadData = async () => {
    const docId = selectedDocId.value || null
    loading.value = true
    annualLoading.value = true
    trendLoading.value = true
    annualFailed.value = false
    trendFailed.value = false
    try {
        const tasks = [
            getAnnualReport(selectedYear.value, docId),
            getMonthlyTrend(trendMonths.value, docId),
            getMedicalRecordsStatus(),
            getPrescriptionsStatus(),
        ]
        if (!doctors.value.length) tasks.push(getAllDoctors())
        const [annualOk, trendOk] = await Promise.all(tasks)
        if (annualOk !== null) annualFailed.value = !annualOk
        if (trendOk !== null) trendFailed.value = !trendOk
    } finally {
        loading.value = false
        annualLoading.value = false
        trendLoading.value = false
    }
}

// ponytail: los seq de la página sólo protegen las flags; la autoridad sobre
// los datos es el contexto (getAnnualReport/getMonthlyTrend).
const loadReport = async () => {
    const seq = ++annualSeq
    annualLoading.value = true
    annualFailed.value = false
    try {
        const ok = await getAnnualReport(selectedYear.value, selectedDocId.value || null)
        if (seq === annualSeq && ok !== null) annualFailed.value = !ok
    } finally {
        if (seq === annualSeq) annualLoading.value = false
    }
}

const loadTrend = async () => {
    const seq = ++trendSeq
    trendLoading.value = true
    trendFailed.value = false
    try {
        const ok = await getMonthlyTrend(trendMonths.value, selectedDocId.value || null)
        if (seq === trendSeq && ok !== null) trendFailed.value = !ok
    } finally {
        if (seq === trendSeq) trendLoading.value = false
    }
}

onMounted(() => {
    if (aToken.value) loadData()
})
</script>

<template>
    <div class="m-5 w-full max-w-6xl">
        <div class="flex items-center justify-between mb-6">
            <p class="text-lg font-medium text-gray-700">{{ t('adminReports.title') }}</p>
            <div class="flex items-center gap-3">
                <select v-if="doctors.length" v-model="selectedDocId" @change="loadData"
                    class="border rounded px-3 py-1.5 text-sm text-slate-600 focus:outline-indigo-400">
                    <option value="">{{ t('adminReports.allDoctors') }}</option>
                    <option v-for="doc in doctors" :key="doc._id" :value="doc._id">{{ doc.name }}</option>
                </select>
                <select v-model="selectedYear" @change="loadReport"
                    class="border rounded px-3 py-1.5 text-sm text-slate-600 focus:outline-indigo-400">
                    <option v-for="y in [2025, 2026, 2027]" :key="y" :value="y">{{ y }}</option>
                </select>
                <button @click="loadData" class="text-xs text-indigo-500 hover:underline cursor-pointer">
                    {{ t('adminReports.refresh') }}
                </button>
                <ReportExportButtons :rows="reportRows" :totals="totals" :trend="monthlyTrend" :year="selectedYear"
                    :title="t('adminReports.title')" :currency="currency" :backend-url="backendUrl" :atoken="aToken"
                    :csv="csvPayload" :disabled="annualLoading || reportRows.length === 0" />
            </div>
        </div>

        <div v-if="failed" class="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 mb-6 text-sm">
            {{ t('adminReports.loadError') }}
            <button @click="loadData" class="ml-2 underline cursor-pointer">{{ t('adminReports.refresh') }}</button>
        </div>

        <div v-if="totals.totalAppointments !== undefined" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div class="bg-white rounded-lg border p-4">
                <p class="text-xs text-slate-400 uppercase">{{ t('adminReports.totalAppointments') }}</p>
                <p class="text-2xl font-semibold text-slate-700 mt-1">{{ totals.totalAppointments }}</p>
            </div>
            <div class="bg-white rounded-lg border p-4">
                <p class="text-xs text-slate-400 uppercase">{{ t('adminReports.completed') }}</p>
                <p class="text-2xl font-semibold text-green-600 mt-1">{{ totals.completedAppointments }}</p>
            </div>
            <div class="bg-white rounded-lg border p-4">
                <p class="text-xs text-slate-400 uppercase">{{ t('adminReports.cancelled') }}</p>
                <p class="text-2xl font-semibold text-red-500 mt-1">{{ totals.cancelledAppointments }}</p>
            </div>
            <div class="bg-white rounded-lg border p-4">
                <p class="text-xs text-slate-400 uppercase">{{ t('adminReports.totalEarnings') }}</p>
                <p class="text-2xl font-semibold text-indigo-600 mt-1">
                    {{ currency }}{{ totals.totalEarnings?.toLocaleString() }}
                </p>
            </div>
        </div>

        <div class="bg-slate-100 rounded-lg border p-6 mb-6">
            <div class="flex items-start justify-between gap-3 mb-4">
                <div>
                    <p class="text-sm font-medium text-slate-600">{{ t('adminReports.monthlyTrend') }}</p>
                    <p class="text-xs text-slate-400">{{ t('adminReports.trendHint') }}</p>
                </div>
                <select v-model="trendMonths" @change="loadTrend"
                    class="border rounded px-2 py-1 text-xs text-slate-600">
                    <option :value="6">{{ t('adminReports.last6') }}</option>
                    <option :value="12">{{ t('adminReports.last12') }}</option>
                    <option :value="24">{{ t('adminReports.last24') }}</option>
                </select>
            </div>

            <div v-if="trendLoading" class="py-10 text-center text-sm text-slate-400 animate-pulse">
                {{ t('adminReports.loading') }}
            </div>
            <div v-else-if="trendFailed" class="py-10 text-center text-sm text-red-500">
                {{ t('adminReports.loadError') }}
            </div>
            <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div v-for="series in trendSeries" :key="series.key" class="bg-white rounded-lg border p-4">
                    <p class="text-sm font-medium text-slate-600">{{ series.title }}</p>
                    <p class="text-xs text-slate-400 mb-3">{{ series.hint }}</p>
                    <div v-if="!hasSeries(series)"
                        class="h-32 flex items-center justify-center text-xs text-slate-400">
                        {{ t('adminReports.chartEmpty') }}
                    </div>
                    <div v-else class="flex items-end gap-1 h-32">
                        <div v-for="point in monthlyTrend" :key="point.label"
                            class="flex-1 flex flex-col items-center gap-1">
                            <div class="w-full rounded-t-sm transition-all duration-500" :class="series.bar"
                                :style="{ height: barHeight(series.max, series.value(point)) }"
                                :title="`${point.label}: ${series.display(series.value(point))}`" />
                            <p class="text-[9px] text-slate-400 rotate-45 origin-left whitespace-nowrap">
                                {{ point.label.slice(0, 3) }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-lg border p-4 mb-6">
            <div class="flex items-center justify-between gap-3 mb-1">
                <p class="text-sm font-medium text-slate-600">{{ t('adminReports.medicalRecordsTitle') }}</p>
                <button @click="getMedicalRecordsStatus" :disabled="medicalRecordsStatusLoading"
                    class="text-xs text-indigo-500 hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                    {{ t('adminReports.refresh') }}
                </button>
            </div>
            <p class="text-xs text-slate-400 mb-4">{{ t('adminReports.medicalRecordsHint') }}</p>

            <div v-if="medicalRecordsStatusLoading && !medicalRecordsStatus"
                class="text-sm text-slate-400 animate-pulse">
                {{ t('adminReports.statusLoading') }}
            </div>
            <div v-else-if="medicalRecordsStatus" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="rounded border bg-slate-50 p-3">
                    <p class="text-xs text-slate-400 uppercase">{{ t('adminReports.totalRecords') }}</p>
                    <p class="text-xl font-semibold text-slate-700 mt-1">
                        {{ medicalRecordsStatus.total ?? 0 }}
                    </p>
                </div>
                <div class="rounded border bg-slate-50 p-3">
                    <p class="text-xs text-slate-400 uppercase">{{ t('adminReports.encryptedRecords') }}</p>
                    <p class="text-xl font-semibold text-indigo-600 mt-1">
                        {{ medicalRecordsStatus.encrypted ?? 0 }}
                    </p>
                </div>
                <div class="rounded border bg-slate-50 p-3">
                    <p class="text-xs text-slate-400 uppercase">{{ t('adminReports.pendingRecords') }}</p>
                    <p class="text-xl font-semibold text-amber-600 mt-1">
                        {{ medicalRecordsStatus.pending ?? 0 }}
                    </p>
                </div>
                <div class="rounded border bg-slate-50 p-3">
                    <p class="text-xs text-slate-400 uppercase">{{ t('adminReports.lastRecord') }}</p>
                    <p class="text-sm font-semibold text-slate-700 mt-1">
                        {{ migratedAtLabel }}
                    </p>
                </div>
            </div>
            <p v-else class="text-sm text-slate-400">{{ t('adminReports.statusUnavailable') }}</p>
        </div>

        <div class="bg-white rounded-lg border p-4 mb-6">
            <div class="flex items-center justify-between gap-3 mb-1">
                <p class="text-sm font-medium text-slate-600">{{ t('adminReports.prescriptionsTitle') }}</p>
                <button @click="getPrescriptionsStatus" :disabled="prescriptionsStatusLoading"
                    class="text-xs text-indigo-500 hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                    {{ t('adminReports.refresh') }}
                </button>
            </div>
            <p class="text-xs text-slate-400 mb-4">{{ t('adminReports.prescriptionsHint') }}</p>

            <div v-if="prescriptionsStatusLoading && !prescriptionsStatus" class="text-sm text-slate-400 animate-pulse">
                {{ t('adminReports.prescriptionsLoading') }}
            </div>
            <div v-else-if="prescriptionsStatus" class="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div class="rounded border bg-slate-50 p-3">
                    <p class="text-xs text-slate-400 uppercase">{{ t('adminReports.totalPrescriptions') }}</p>
                    <p class="text-xl font-semibold text-slate-700 mt-1">
                        {{ prescriptionsStatus.total ?? 0 }}
                    </p>
                </div>
                <div class="rounded border bg-slate-50 p-3">
                    <p class="text-xs text-slate-400 uppercase">{{ t('adminReports.activePrescriptions') }}</p>
                    <p class="text-xl font-semibold text-emerald-600 mt-1">
                        {{ prescriptionsStatus.active ?? 0 }}
                    </p>
                </div>
                <div class="rounded border bg-slate-50 p-3">
                    <p class="text-xs text-slate-400 uppercase">{{ t('adminReports.revokedPrescriptions') }}</p>
                    <p class="text-xl font-semibold text-rose-600 mt-1">
                        {{ prescriptionsStatus.revoked ?? 0 }}
                    </p>
                </div>
                <div class="rounded border bg-slate-50 p-3">
                    <p class="text-xs text-slate-400 uppercase">{{ t('adminReports.pendingPrescriptions') }}</p>
                    <p class="text-xl font-semibold text-amber-600 mt-1">
                        {{ prescriptionsStatus.pending ?? 0 }}
                    </p>
                </div>
                <div class="rounded border bg-slate-50 p-3">
                    <p class="text-xs text-slate-400 uppercase">{{ t('adminReports.latestPrescription') }}</p>
                    <p class="text-sm font-semibold text-slate-700 mt-1">
                        {{ latestPrescriptionLabel }}
                    </p>
                </div>
            </div>
            <p v-else class="text-sm text-slate-400">{{ t('adminReports.prescriptionsUnavailable') }}</p>
        </div>

        <p class="text-lg font-medium text-slate-600 pb-4">
            {{ t('adminReports.monthlyBreakdown') }} — {{ selectedYear }}
            <span class="text-xs text-slate-400 ml-2">{{ t('adminReports.showingStats') }}</span>
        </p>

        <div class="bg-slate-100 rounded-lg border overflow-hidden mb-6">
            <div v-if="loading" class="text-center py-10 text-slate-400 text-sm animate-pulse">
                {{ t('adminReports.loading') }}
            </div>

            <table v-else class="w-full text-sm text-gray-600">
                <thead>
                    <tr class="border-b text-xs text-gray-600 uppercase bg-slate-200">
                        <th v-for="col in tableColumns" :key="col.key" class="py-3" :class="[col.align, col.cell]">
                            {{ col.label }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in reportRows" :key="row.month" class="border-b hover:bg-indigo-50 transition-colors"
                        :class="{ 'bg-indigo-50/40': row.totalAppointments > 0 }">
                        <td v-for="col in tableColumns" :key="col.key" class="py-3" :class="[col.align, col.cell]">
                            {{ col.value(row) }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>