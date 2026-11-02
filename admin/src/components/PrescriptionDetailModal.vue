<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { useDoctorContext } from '../context/DoctorContext'
import { formatMedicalRecordDate } from '../composables/useMedicalRecordExport'

const props = defineProps({
    prescription: { type: Object, required: true },
    patientName: { type: String, default: '' },
    doctorName: { type: String, default: '' },
})

const emit = defineEmits(['close', 'revoked'])

const { t, locale } = useI18n()
const toast = useToast()
const { revokePrescription } = useDoctorContext()

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const dialogRef = ref(null)
const closeButtonRef = ref(null)
const current = ref({ ...props.prescription })
const confirming = ref(false)
const revoking = ref(false)
const error = ref('')

let lastFocused = null

watch(
    () => props.prescription,
    (value) => {
        current.value = { ...value }
    },
)

const revoked = computed(
    () => Boolean(current.value?.revokedAt) || current.value?.status === 'revoked',
)
const items = computed(() => (Array.isArray(current.value?.items) ? current.value.items : []))
const issuedAtLabel = computed(() => formatMedicalRecordDate(current.value?.issuedAt, locale.value))
const revokedAtLabel = computed(() => formatMedicalRecordDate(current.value?.revokedAt, locale.value))

const close = () => {
    if (revoking.value) return
    emit('close')
}

const onKeydown = (event) => {
    if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
    }
    if (event.key !== 'Tab' || !dialogRef.value) return

    const focusable = Array.from(dialogRef.value.querySelectorAll(FOCUSABLE))
    if (focusable.length === 0) {
        event.preventDefault()
        dialogRef.value.focus()
        return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (!dialogRef.value.contains(document.activeElement)) {
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

onMounted(() => {
    lastFocused = document.activeElement
    document.addEventListener('keydown', onKeydown)
    document.body.style.overflow = 'hidden'
    nextTick(() => closeButtonRef.value?.focus())
})

onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
    if (lastFocused instanceof HTMLElement) lastFocused.focus()
})

const revoke = async () => {
    if (revoking.value) return
    revoking.value = true
    error.value = ''

    const result = await revokePrescription(current.value._id)
    revoking.value = false

    if (!result.ok) {
        error.value = result.status === 401
            ? t('prescriptionDetail.errorSession')
            : t('prescriptionDetail.revokeError')
        return
    }

    current.value = {
        ...current.value,
        revokedAt: result.revokedAt || new Date().toISOString(),
        status: 'revoked',
    }
    confirming.value = false

    if (result.alreadyRevoked) {
        toast.info(t('prescriptionDetail.alreadyRevoked'))
    } else {
        toast.success(t('prescriptionDetail.revokedSuccess'))
    }

    emit('revoked', current.value)
}
</script>

<template>
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" @click.self="close"
        role="dialog" aria-modal="true" aria-labelledby="prescription-detail-title">
        <div ref="dialogRef" tabindex="-1"
            class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl outline-none">
            <div class="flex items-start justify-between gap-4 border-b p-5">
                <div>
                    <div class="flex flex-wrap items-center gap-2">
                        <h2 id="prescription-detail-title" class="text-lg font-medium text-slate-700">
                            {{ t('prescriptionDetail.title') }}
                        </h2>
                        <span :class="[
                            'rounded-full px-2.5 py-0.5 text-xs font-medium',
                            revoked ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        ]">
                            {{ revoked ? t('prescriptionDetail.revoked') : t('prescriptionDetail.active') }}
                        </span>
                    </div>
                    <p class="text-sm text-slate-500">{{ issuedAtLabel }}</p>
                </div>
                <button ref="closeButtonRef" type="button" @click="close" :disabled="revoking"
                    class="text-2xl leading-none text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
                    :aria-label="t('prescriptionDetail.close')">
                    ×
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-5 space-y-5 text-sm text-slate-600">
                <p v-if="error" role="alert" class="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                    {{ error }}
                </p>

                <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <dt class="text-xs uppercase text-slate-400">{{ t('prescriptionDetail.patient') }}</dt>
                        <dd class="mt-1 font-medium text-slate-700">
                            {{ patientName || t('doctorRecords.unknownPatient') }}
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs uppercase text-slate-400">{{ t('prescriptionDetail.doctor') }}</dt>
                        <dd class="mt-1 font-medium text-slate-700">
                            {{ doctorName || t('doctorRecords.unknownDoctor') }}
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs uppercase text-slate-400">{{ t('prescriptionDetail.issuedAt') }}</dt>
                        <dd class="mt-1 font-medium text-slate-700">{{ issuedAtLabel }}</dd>
                    </div>
                    <div v-if="revoked">
                        <dt class="text-xs uppercase text-slate-400">{{ t('prescriptionDetail.revokedAt') }}</dt>
                        <dd class="mt-1 font-medium text-rose-600">{{ revokedAtLabel }}</dd>
                    </div>
                </dl>

                <div>
                    <p class="text-xs uppercase text-slate-400">{{ t('prescriptionDetail.items') }}</p>
                    <div class="mt-2 overflow-x-auto">
                        <table class="w-full min-w-120 text-left text-sm">
                            <thead>
                                <tr class="border-b bg-slate-100 text-xs uppercase text-slate-500">
                                    <th class="py-2 px-3 font-medium">{{ t('prescriptionDetail.drug') }}</th>
                                    <th class="py-2 px-3 font-medium">{{ t('prescriptionDetail.dose') }}</th>
                                    <th class="py-2 px-3 font-medium">{{ t('prescriptionDetail.frequency') }}</th>
                                    <th class="py-2 px-3 font-medium">{{ t('prescriptionDetail.days') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(item, index) in items" :key="`${item.drug}-${index}`"
                                    class="border-b border-slate-100">
                                    <td class="py-2 px-3 font-medium text-slate-700">{{ item.drug }}</td>
                                    <td class="py-2 px-3">{{ item.dose }}</td>
                                    <td class="py-2 px-3">{{ item.frequency }}</td>
                                    <td class="py-2 px-3">{{ item.days }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div v-if="confirming" class="rounded border border-rose-200 bg-rose-50 p-4">
                    <p class="text-sm text-rose-700">{{ t('prescriptionDetail.revokeConfirm') }}</p>
                    <div class="mt-3 flex flex-wrap justify-end gap-2">
                        <button type="button" @click="confirming = false" :disabled="revoking"
                            class="min-h-11 rounded border px-4 py-2 text-sm text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            {{ t('prescriptionDetail.revokeNo') }}
                        </button>
                        <button type="button" @click="revoke" :disabled="revoking"
                            class="min-h-11 rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            {{ revoking ? t('prescriptionDetail.revoking') : t('prescriptionDetail.revokeYes') }}
                        </button>
                    </div>
                </div>
            </div>

            <div class="flex flex-col gap-3 border-t p-5 sm:flex-row sm:justify-end">
                <button type="button" @click="close" :disabled="revoking"
                    class="min-h-11 rounded border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                    {{ t('prescriptionDetail.close') }}
                </button>
                <button v-if="!revoked && !confirming" type="button" @click="confirming = true"
                    class="min-h-11 rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 cursor-pointer">
                    {{ t('prescriptionDetail.revoke') }}
                </button>
            </div>
        </div>
    </div>

</template>