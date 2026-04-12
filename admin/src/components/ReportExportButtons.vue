<script setup>
import { useReportExport } from '../composables/useReportExport.js'

const props = defineProps({
    rows: { type: Array, default: () => [] },
    totals: { type: Object, default: () => ({}) },
    trend: { type: Array, default: () => [] },
    year: { type: Number, required: true },
    title: { type: String, default: 'Annual Report' },
    currency: { type: String, default: '$' },
    doctor: { type: String, default: null },
    disabled: { type: Boolean, default: false },
})

const { exportPDF, exportExcel, exporting } = useReportExport()

const payload = () => ({
    rows: props.rows,
    totals: props.totals,
    trend: props.trend,
    year: props.year,
    title: props.title,
    currency: props.currency,
    doctor: props.doctor,
})

const handlePDF = () => exportPDF(payload())
const handleExcel = () => exportExcel(payload())
</script>

<template>
    <div class="flex items-center gap-2">
        <button @click="handlePDF" :disabled="disabled || exporting"
            :title="exporting ? 'Generating…' : 'Download PDF report'" class="group relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium
                    border border-red-200 text-red-600 bg-white
                    hover:bg-red-50 hover:border-red-400 hover:text-red-700
                    active:scale-95
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-150 shadow-sm cursor-pointer
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
            <svg v-if="exporting" class="w-4 h-4 animate-spin text-red-500" xmlns="http://www.w3.org/2000/svg"
                fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>

            <svg v-else class="w-4 h-4 text-red-500 group-hover:text-red-600 transition-colors"
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 18H17V16H7v2zm10-8H14V6h-4v4H7l5 5 5-5z" />
                <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M4 2a2 2 0 00-2 2v16a2 2 0 002 2h16a2 2 0 002-2V8l-6-6H4zm0 2h10v5h5v11H4V4z" />
            </svg>

            <span>PDF</span>

            <span v-if="exporting"
                class="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-red-500 animate-ping opacity-75" />
        </button>

        <button @click="handleExcel" :disabled="disabled || exporting"
            :title="exporting ? 'Generating…' : 'Download Excel report'" class="group relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium
                    border border-green-200 text-green-700 bg-white
                    hover:bg-green-50 hover:border-green-400 hover:text-green-800
                    active:scale-95
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-150 shadow-sm cursor-pointer
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400">
            <svg v-if="exporting" class="w-4 h-4 animate-spin text-green-600" xmlns="http://www.w3.org/2000/svg"
                fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>

            <svg v-else class="w-4 h-4 text-green-600 group-hover:text-green-700 transition-colors"
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path
                    d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
                <path d="M8 13h2v2H8zm0 3h2v2H8zm3-3h2v2h-2zm0 3h2v2h-2zm3-3h2v2h-2zm0 3h2v2h-2z" />
            </svg>

            <span>Excel</span>

            <span v-if="exporting"
                class="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75" />
        </button>
    </div>
</template>