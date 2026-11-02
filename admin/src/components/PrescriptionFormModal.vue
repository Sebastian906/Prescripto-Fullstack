<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { useDoctorContext } from '../context/DoctorContext'
import { formatMedicalRecordDate } from '../composables/useMedicalRecordExport'

const props = defineProps({
    record: { type: Object, required: true },
    patientName: { type: String, default: '' },
})

const emit = defineEmits(['close', 'issued'])

const { t, locale } = useI18n()
const toast = useToast()
const { issuePrescription } = useDoctorContext()

const MAX_ITEMS = 25
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const dialogRef = ref(null)
const closeButtonRef = ref(null)
const submitting = ref(false)
const formError = ref('')
const fieldErrors = ref({})

const createItem = () => ({ drug: '', dose: '', frequency: '', days: '' })
const items = ref([createItem()])

const recordDate = computed(() => formatMedicalRecordDate(props.record?.createdAt, locale.value))

let lastFocused = null

const close = () => {
    if (submitting.value) return
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

const addItem = () => {
    if (items.value.length >= MAX_ITEMS) return
    items.value.push(createItem())
}

const removeItem = (index) => {
    if (items.value.length <= 1) return
    items.value.splice(index, 1)
    fieldErrors.value = {}
}

const textError = (value, min, max) => {
    const text = String(value ?? '').trim()
    return text.length < min || text.length > max
}

const validate = () => {
    const errors = {}

    if (items.value.length < 1) errors.items = t('prescriptionForm.errorRequired')
    if (items.value.length > MAX_ITEMS) errors.items = t('prescriptionForm.errorTooMany')

    items.value.forEach((item, index) => {
        const row = {}

        if (textError(item.drug, 2, 120)) row.drug = t('prescriptionForm.errors.drug')
        if (textError(item.dose, 1, 80)) row.dose = t('prescriptionForm.errors.dose')
        if (textError(item.frequency, 1, 80)) row.frequency = t('prescriptionForm.errors.frequency')

        const days = Number(item.days)
        if (!Number.isInteger(days) || days < 1 || days > 365) {
            row.days = t('prescriptionForm.errors.days')
        }

        if (Object.keys(row).length > 0) errors[index] = row
    })

    fieldErrors.value = errors
    return Object.keys(errors).length === 0
}

const submit = async () => {
    if (submitting.value) return
    formError.value = ''

    if (!validate()) {
        formError.value = t('prescriptionForm.errorValidation')
        return
    }

    submitting.value = true
    const result = await issuePrescription({
        recordId: props.record._id,
        items: items.value.map((item) => ({
            drug: item.drug.trim(),
            dose: item.dose.trim(),
            frequency: item.frequency.trim(),
            days: Number(item.days),
        })),
    })
    submitting.value = false

    if (result.ok) {
        toast.success(t('prescriptionForm.success'))
        emit('issued', result.id)
        return
    }

    if (result.status === 403) {
        formError.value = t('prescriptionForm.errorForbidden')
    } else if (result.status === 409) {
        formError.value = t('prescriptionForm.errorDuplicate')
    } else if (result.status === 401) {
        formError.value = t('prescriptionForm.errorSession')
    } else if (result.status === 400) {
        formError.value = t('prescriptionForm.errorValidation')
    } else {
        formError.value = t('prescriptionForm.errorGeneric')
    }
}

</script>

<template>
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" @click.self="close"
        role="dialog" aria-modal="true" aria-labelledby="prescription-form-title">
        <div ref="dialogRef" tabindex="-1"
            class="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl outline-none">
            <div class="flex items-start justify-between gap-4 border-b p-5">
                <div>
                    <h2 id="prescription-form-title" class="text-lg font-medium text-slate-700">
                        {{ t('prescriptionForm.title') }}
                    </h2>
                    <p class="text-sm text-slate-500">
                        {{ t('prescriptionForm.patient') }}: {{ patientName || t('doctorRecords.unknownPatient') }}
                        · {{ recordDate }}
                    </p>
                </div>
                <button ref="closeButtonRef" type="button" @click="close" :disabled="submitting"
                    class="text-2xl leading-none text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
                    :aria-label="t('prescriptionForm.close')">
                    ×
                </button>
            </div>
            <form class="flex-1 overflow-y-auto p-5 space-y-4" @submit.prevent="submit">
                <p v-if="formError" role="alert"
                    class="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {{ formError }}
                </p>

                <div v-for="(item, index) in items" :key="index"
                    class="rounded border border-slate-200 bg-slate-50 p-3">
                    <div class="mb-2 flex items-center justify-between gap-2">
                        <p class="text-xs font-medium uppercase text-slate-400">
                            {{ t('prescriptionForm.item', { index: index + 1 }) }}
                        </p>
                        <button type="button" @click="removeItem(index)" :disabled="items.length <= 1 || submitting"
                            class="min-h-11 rounded px-3 text-xs text-rose-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                            {{ t('prescriptionForm.removeItem') }}
                        </button>
                    </div>

                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-12">
                        <div class="sm:col-span-4">
                            <label :for="`rx-drug-${index}`" class="text-xs text-slate-500">
                                {{ t('prescriptionForm.drug') }}
                            </label>
                            <input :id="`rx-drug-${index}`" v-model="item.drug" type="text" maxlength="120"
                                :placeholder="t('prescriptionForm.drugPlaceholder')"
                                :aria-invalid="fieldErrors[index]?.drug ? 'true' : 'false'"
                                :aria-describedby="fieldErrors[index]?.drug ? `rx-drug-error-${index}` : undefined"
                                :class="[
                                    'mt-1 w-full min-h-11 rounded border px-3 py-2 text-sm focus:outline-indigo-400',
                                    fieldErrors[index]?.drug ? 'border-rose-400' : 'border-slate-300'
                                ]" />
                            <p v-if="fieldErrors[index]?.drug" :id="`rx-drug-error-${index}`"
                                class="mt-1 text-xs text-rose-600">
                                {{ fieldErrors[index].drug }}
                            </p>
                        </div>

                        <div class="sm:col-span-2">
                            <label :for="`rx-dose-${index}`" class="text-xs text-slate-500">
                                {{ t('prescriptionForm.dose') }}
                            </label>
                            <input :id="`rx-dose-${index}`" v-model="item.dose" type="text" maxlength="80"
                                :placeholder="t('prescriptionForm.dosePlaceholder')"
                                :aria-invalid="fieldErrors[index]?.dose ? 'true' : 'false'"
                                :aria-describedby="fieldErrors[index]?.dose ? `rx-dose-error-${index}` : undefined"
                                :class="[
                                    'mt-1 w-full min-h-11 rounded border px-3 py-2 text-sm focus:outline-indigo-400',
                                    fieldErrors[index]?.dose ? 'border-rose-400' : 'border-slate-300'
                                ]" />
                            <p v-if="fieldErrors[index]?.dose" :id="`rx-dose-error-${index}`"
                                class="mt-1 text-xs text-rose-600">
                                {{ fieldErrors[index].dose }}
                            </p>
                        </div>

                        <div class="sm:col-span-3">
                            <label :for="`rx-frequency-${index}`" class="text-xs text-slate-500">
                                {{ t('prescriptionForm.frequency') }}
                            </label>
                            <input :id="`rx-frequency-${index}`" v-model="item.frequency" type="text" maxlength="80"
                                :placeholder="t('prescriptionForm.frequencyPlaceholder')"
                                :aria-invalid="fieldErrors[index]?.frequency ? 'true' : 'false'"
                                :aria-describedby="fieldErrors[index]?.frequency ? `rx-frequency-error-${index}` : undefined"
                                :class="[
                                    'mt-1 w-full min-h-11 rounded border px-3 py-2 text-sm focus:outline-indigo-400',
                                    fieldErrors[index]?.frequency ? 'border-rose-400' : 'border-slate-300'
                                ]" />
                            <p v-if="fieldErrors[index]?.frequency" :id="`rx-frequency-error-${index}`"
                                class="mt-1 text-xs text-rose-600">
                                {{ fieldErrors[index].frequency }}
                            </p>
                        </div>

                        <div class="sm:col-span-3">
                            <label :for="`rx-days-${index}`" class="text-xs text-slate-500">
                                {{ t('prescriptionForm.days') }}
                            </label>
                            <input :id="`rx-days-${index}`" v-model="item.days" type="number" min="1" max="365"
                                inputmode="numeric" :aria-invalid="fieldErrors[index]?.days ? 'true' : 'false'"
                                :aria-describedby="fieldErrors[index]?.days ? `rx-days-error-${index}` : undefined"
                                :class="[
                                    'mt-1 w-full min-h-11 rounded border px-3 py-2 text-sm focus:outline-indigo-400',
                                    fieldErrors[index]?.days ? 'border-rose-400' : 'border-slate-300'
                                ]" />
                            <p v-if="fieldErrors[index]?.days" :id="`rx-days-error-${index}`"
                                class="mt-1 text-xs text-rose-600">
                                {{ fieldErrors[index].days }}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <button type="button" @click="addItem" :disabled="items.length >= MAX_ITEMS || submitting"
                        class="min-h-11 rounded border border-indigo-500 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                        {{ t('prescriptionForm.addItem') }}
                    </button>
                    <p class="text-xs text-slate-400">{{ items.length }} / {{ MAX_ITEMS }}</p>
                </div>
            </form>

            <div class="flex flex-col gap-3 border-t p-5 sm:flex-row sm:justify-end">
                <button type="button" @click="close" :disabled="submitting"
                    class="min-h-11 rounded border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                    {{ t('prescriptionForm.cancel') }}
                </button>
                <button type="button" @click="submit" :disabled="submitting"
                    class="min-h-11 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                    {{ submitting ? t('prescriptionForm.submitting') : t('prescriptionForm.submit') }}
                </button>
            </div>
        </div>
    </div>

</template>