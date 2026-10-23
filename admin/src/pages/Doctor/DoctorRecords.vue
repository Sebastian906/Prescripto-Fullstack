<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { useDoctorContext } from '../../context/DoctorContext'
import {
    formatMedicalRecordDate,
    isSafeMedicalRecordUrl,
    medicalRecordDiagnosisLabel,
} from '../../composables/useMedicalRecordExport'

const { t, te, locale } = useI18n()
const toast = useToast()
const {
    dToken,
    records,
    recordsLoading,
    getRecords,
    appointments,
    getAppointments,
    profileData,
    getProfileData,
} = useDoctorContext()
const { exportMedicalRecordPDF, exporting } = useMedicalRecordExport()

const PAGE_SIZE = 8
const currentPage = ref(1)
const selected = ref(null)
const modalRef = ref(null)
let lastFocused = null

const totalPages = computed(() => Math.max(1, Math.ceil(records.value.length / PAGE_SIZE)))
const pageNumbers = computed(() => Array.from({ length: totalPages.value }, (_, index) => index + 1))
const paginatedRecords = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return records.value.slice(start, start + PAGE_SIZE)
})

const appointmentById = computed(() => {
    const map = new Map()
    for (const appointment of appointments.value) {
        map.set(String(appointment._id), appointment)
    }
    return map
})

const patientFor = (record) => appointmentById.value.get(String(record?.appointmentId))?.userData ?? null
const patientName = (record) => patientFor(record)?.name || t('doctorRecords.unknownPatient')

const diagnosisLabel = (code) => medicalRecordDiagnosisLabel(code, t, te)
const formatDate = (value) => formatMedicalRecordDate(value, locale.value)

const selectedAttachments = computed(() => {
    const values = selected.value?.attachments
    return Array.isArray(values) ? values.filter(isSafeMedicalRecordUrl) : []
})

const goToPage = (page) => {
    if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

const openRecord = (record) => {
    lastFocused = document.activeElement
    selected.value = record
    nextTick(() => modalRef.value?.focus())
}

const closeRecord = () => {
    selected.value = null
    nextTick(() => {
        if (lastFocused instanceof HTMLElement) lastFocused.focus()
    })
}

const downloadRecord = async (record) => {
    if (!record) return
    try {
        await exportMedicalRecordPDF(record, {
            patientName: patientName(record),
            doctorName: profileData.value?.name || t('doctorRecords.unknownDoctor'),
        })
    } catch {
        toast.error(t('doctorRecords.downloadError'))
    }
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const onKeydown = (event) => {
    if (!selected.value) return

    if (event.key === 'Escape') {
        event.preventDefault()
        closeRecord()
        return
    }

    if (event.key !== 'Tab' || !modalRef.value) return

    const focusable = Array.from(modalRef.value.querySelectorAll(FOCUSABLE))
    if (focusable.length === 0) {
        event.preventDefault()
        modalRef.value.focus()
        return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (!modalRef.value.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
        return
    }

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
    }
}

watch(totalPages, (pages) => {
    if (currentPage.value > pages) currentPage.value = pages
})

watch(selected, (value) => {
    document.body.style.overflow = value ? 'hidden' : ''
})

onMounted(async () => {
    document.addEventListener('keydown', onKeydown)
    if (!dToken.value) return

    await Promise.all([
        getRecords(),
        appointments.value.length === 0 ? getAppointments() : Promise.resolve(),
        profileData.value?.name ? Promise.resolve() : getProfileData(),
    ])
})

onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
})
</script>

<template>
    <div class="w-full max-w-6xl m-5">
        <div class="flex items-center justify-between gap-3 mb-3">
            <div>
                <p class="text-lg font-medium">{{ t('doctorRecords.title') }}</p>
                <p class="text-sm text-slate-500">{{ t('doctorRecords.subtitle') }}</p>
            </div>
            <button @click="getRecords" :disabled="recordsLoading"
                class="text-xs text-indigo-500 hover:underline disabled:opacity-50 disabled:cursor-not-allowed">
                {{ t('doctorRecords.refresh') }}
            </button>
        </div>

        <div class="bg-slate-100 border rounded text-sm overflow-x-auto">
            <table class="w-full min-w-180">
                <thead>
                    <tr class="border-b bg-slate-200 text-xs uppercase text-gray-600">
                        <th class="py-3 px-4 text-left">{{ t('doctorRecords.number') }}</th>
                        <th class="py-3 px-4 text-left">{{ t('doctorRecords.date') }}</th>
                        <th class="py-3 px-4 text-left">{{ t('doctorRecords.patient') }}</th>
                        <th class="py-3 px-4 text-left">{{ t('doctorRecords.diagnosis') }}</th>
                        <th class="py-3 px-4 text-left">{{ t('doctorRecords.attachments') }}</th>
                        <th class="py-3 px-4 text-right">{{ t('doctorRecords.actions') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="recordsLoading">
                        <td colspan="6" class="py-12 text-center text-slate-400 animate-pulse">
                            {{ t('doctorRecords.loading') }}
                        </td>
                    </tr>
                    <tr v-else-if="records.length === 0">
                        <td colspan="6" class="py-12 text-center text-slate-400">
                            {{ t('doctorRecords.empty') }}
                        </td>
                    </tr>
                    <template v-else>
                        <tr v-for="(record, index) in paginatedRecords" :key="record._id"
                            class="border-b hover:bg-gray-200 transition-colors">
                            <td class="py-3 px-4 text-slate-500">
                                {{ (currentPage - 1) * PAGE_SIZE + index + 1 }}
                            </td>
                            <td class="py-3 px-4 text-slate-500">
                                {{ formatDate(record.createdAt) }}
                            </td>
                            <td class="py-3 px-4">
                                <div class="flex items-center gap-2">
                                    <img v-if="patientFor(record)?.image"
                                        class="w-8 h-8 rounded-full object-cover"
                                        :src="patientFor(record).image"
                                        :alt="patientName(record)" />
                                    <div v-else
                                        class="w-8 h-8 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-medium">
                                        {{ patientName(record).charAt(0).toUpperCase() }}
                                    </div>
                                    <span class="text-slate-700">{{ patientName(record) }}</span>
                                </div>
                            </td>
                            <td class="py-3 px-4 text-slate-600">
                                {{ diagnosisLabel(record.diagnosis) }}
                            </td>
                            <td class="py-3 px-4 text-slate-500">
                                {{ record.attachments?.length ?? 0 }}
                            </td>
                            <td class="py-3 px-4">
                                <div class="flex items-center justify-end gap-3">
                                    <button @click="openRecord(record)"
                                        class="text-indigo-600 hover:underline cursor-pointer">
                                        {{ t('doctorRecords.view') }}
                                    </button>
                                    <button @click="downloadRecord(record)" :disabled="exporting"
                                        class="text-slate-500 hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                                        {{ t('doctorRecords.downloadPdf') }}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>

        <div v-if="totalPages > 1" class="flex items-center justify-center gap-1 mt-4">
            <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1"
                class="px-3 py-1.5 rounded border text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                {{ t('doctorRecords.previous') }}
            </button>

            <button v-for="page in pageNumbers" :key="page" @click="goToPage(page)" :class="[
                'px-3 py-1.5 rounded border text-sm transition-colors cursor-pointer',
                page === currentPage
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'text-slate-600 hover:bg-slate-100'
            ]">
                {{ page }}
            </button>

            <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages"
                class="px-3 py-1.5 rounded border text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                {{ t('doctorRecords.next') }}
            </button>
        </div>

        <p v-if="records.length > 0" class="text-center text-xs text-slate-400 mt-2">
            {{ t('doctorRecords.showing') }}
            {{ (currentPage - 1) * PAGE_SIZE + 1 }}–{{ Math.min(currentPage * PAGE_SIZE, records.length) }}
            {{ t('doctorRecords.of') }} {{ records.length }} {{ t('doctorRecords.records') }}
        </p>

        <div v-if="selected" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            @click.self="closeRecord" role="dialog" aria-modal="true" aria-labelledby="record-modal-title">
            <div ref="modalRef" tabindex="-1"
                class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl outline-none">
                <div class="flex items-start justify-between gap-4 border-b p-5">
                    <div>
                        <h2 id="record-modal-title" class="text-lg font-medium text-slate-700">
                            {{ t('doctorRecords.modalTitle') }}
                        </h2>
                        <p class="text-sm text-slate-500">{{ formatDate(selected.createdAt) }}</p>
                    </div>
                    <button @click="closeRecord"
                        class="text-slate-400 hover:text-slate-600 text-2xl leading-none cursor-pointer"
                        :aria-label="t('doctorRecords.close')">
                        ×
                    </button>
                </div>

                <div class="p-5 space-y-5 text-sm text-slate-600">
                    <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <dt class="text-xs uppercase text-slate-400">{{ t('doctorRecords.patient') }}</dt>
                            <dd class="mt-1 font-medium text-slate-700">{{ patientName(selected) }}</dd>
                        </div>
                        <div>
                            <dt class="text-xs uppercase text-slate-400">{{ t('doctorRecords.doctor') }}</dt>
                            <dd class="mt-1 font-medium text-slate-700">
                                {{ profileData?.name || t('doctorRecords.unknownDoctor') }}
                            </dd>
                        </div>
                        <div>
                            <dt class="text-xs uppercase text-slate-400">{{ t('doctorRecords.diagnosis') }}</dt>
                            <dd class="mt-1 font-medium text-slate-700">
                                {{ diagnosisLabel(selected.diagnosis) }}
                            </dd>
                        </div>
                        <div>
                            <dt class="text-xs uppercase text-slate-400">{{ t('doctorRecords.date') }}</dt>
                            <dd class="mt-1 font-medium text-slate-700">
                                {{ formatDate(selected.createdAt) }}
                            </dd>
                        </div>
                    </dl>

                    <div>
                        <p class="text-xs uppercase text-slate-400">{{ t('doctorRecords.notes') }}</p>
                        <p class="mt-1 whitespace-pre-wrap text-slate-700">
                            {{ selected.notes || t('doctorRecords.noNotes') }}
                        </p>
                    </div>

                    <div>
                        <p class="text-xs uppercase text-slate-400">{{ t('doctorRecords.attachments') }}</p>
                        <ul v-if="selectedAttachments.length" class="mt-2 space-y-1">
                            <li v-for="(url, index) in selectedAttachments" :key="url">
                                <a :href="url" target="_blank" rel="noopener noreferrer"
                                    class="text-indigo-600 hover:underline">
                                    {{ t('doctorRecords.attachment') }} {{ index + 1 }}
                                </a>
                            </li>
                        </ul>
                        <p v-else class="mt-1 text-slate-400">{{ t('doctorRecords.noAttachments') }}</p>
                    </div>
                </div>

                <div class="flex justify-end gap-3 border-t p-5">
                    <button @click="closeRecord"
                        class="rounded border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
                        {{ t('doctorRecords.close') }}
                    </button>
                    <button @click="downloadRecord(selected)" :disabled="exporting"
                        class="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                        {{ t('doctorRecords.downloadPdf') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>