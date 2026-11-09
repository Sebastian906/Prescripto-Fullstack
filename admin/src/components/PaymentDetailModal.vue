<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { useAdminContext } from '../context/AdminContext'

const props = defineProps({
    open: { type: Boolean, default: false },
    appointment: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['close', 'refunded'])

const { t, locale } = useI18n()
const toast = useToast()
const { getPayment, refundPayment } = useAdminContext()

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const dialogRef = ref(null)
const closeButtonRef = ref(null)
const payment = ref(null)
const loading = ref(false)
const notFound = ref(false)
const error = ref('')
const refundAmount = ref('')
const refundError = ref('')
const refunding = ref(false)

let lastFocused = null
let listening = false

const appointmentId = computed(() => props.appointment?._id || '')
const patientName = computed(() => props.appointment?.userData?.name || '—')
const doctorName = computed(() => props.appointment?.docData?.name || '—')

const amount = computed(() => Number(payment.value?.amount) || 0)
const refundedAmount = computed(() => Number(payment.value?.refundedAmount) || 0)
const remaining = computed(() => Math.max(0, Math.round((amount.value - refundedAmount.value) * 100) / 100))
const canRefund = computed(
    () => payment.value?.status === 'paid' && remaining.value > 0 && !payment.value?.refundPendingAmount,
)

const statusLabel = computed(() => {
    const status = payment.value?.status || 'pending'
    return t(`paymentDetail.statuses.${status}`)
})
const methodLabel = computed(() => {
    const method = payment.value?.method || 'cod'
    return t(`paymentDetail.methods.${method}`)
})
const statusClass = computed(() => {
    switch (payment.value?.status) {
        case 'paid':
            return 'bg-emerald-100 text-emerald-700'
        case 'refunded':
            return 'bg-sky-100 text-sky-700'
        case 'failed':
            return 'bg-rose-100 text-rose-700'
        default:
            return 'bg-amber-100 text-amber-700'
    }
})

const formatDate = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

const formatMoney = (value) => {
    const currency = (payment.value?.currency || 'usd').toUpperCase()
    const numeric = Number(value) || 0
    try {
        return new Intl.NumberFormat(locale.value, { style: 'currency', currency }).format(numeric)
    } catch {
        return `${currency} ${numeric.toFixed(2)}`
    }
}

const normalizeAmount = (value) => Math.round(Number(value) * 100) / 100

const reset = () => {
    payment.value = null
    loading.value = false
    notFound.value = false
    error.value = ''
    refundAmount.value = ''
    refundError.value = ''
    refunding.value = false
}

const loadPayment = async () => {
    if (!appointmentId.value) return

    loading.value = true
    notFound.value = false
    error.value = ''
    refundError.value = ''
    payment.value = null

    const result = await getPayment(appointmentId.value)
    loading.value = false

    if (!result.success) {
        if (result.status === 404) {
            notFound.value = true
        } else {
            error.value = result.message || t('paymentDetail.loadError')
        }
        return
    }

    payment.value = result.payment
    refundAmount.value = remaining.value > 0 ? remaining.value.toFixed(2) : ''
}

const refundMessage = (result) => {
    if (result.status === 401 || result.status === 403) {
        return t('paymentDetail.refund.errorSession')
    }

    const message = result.message || ''
    if (message.includes('exceeds')) return t('paymentDetail.refund.errorExceeds')
    if (message.includes('positive')) return t('paymentDetail.refund.errorPositive')
    if (message.includes('already in progress')) return t('paymentDetail.refund.errorInProgress')
    if (message.includes('Cannot refund')) return t('paymentDetail.refund.errorNotRefundable')
    return message || t('paymentDetail.refund.errorGeneric')
}

const submitRefund = async () => {
    if (refunding.value || !canRefund.value) return

    const numeric = normalizeAmount(refundAmount.value)
    if (!Number.isFinite(numeric) || numeric <= 0) {
        refundError.value = t('paymentDetail.refund.errorPositive')
        return
    }
    if (numeric > remaining.value) {
        refundError.value = t('paymentDetail.refund.errorExceeds')
        return
    }

    refunding.value = true
    refundError.value = ''

    const result = await refundPayment(appointmentId.value, numeric)
    refunding.value = false

    if (!result.success) {
        refundError.value = refundMessage(result)
        return
    }

    payment.value = result.payment
    refundAmount.value = remaining.value > 0 ? remaining.value.toFixed(2) : ''
    toast.success(t('paymentDetail.refund.success'))
    emit('refunded', result.payment)
}

const close = () => {
    if (refunding.value) return
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

const activate = () => {
    if (listening) return
    listening = true
    lastFocused = document.activeElement
    document.addEventListener('keydown', onKeydown)
    document.body.style.overflow = 'hidden'
    nextTick(() => closeButtonRef.value?.focus())
}

const deactivate = () => {
    if (!listening) return
    listening = false
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
    if (lastFocused instanceof HTMLElement) lastFocused.focus()
    lastFocused = null
}

watch(
    () => props.open,
    (open) => {
        if (open) {
            activate()
            loadPayment()
        } else {
            deactivate()
            reset()
        }
    },
)

onMounted(() => {
    if (props.open) {
        activate()
        loadPayment()
    }
})

onBeforeUnmount(deactivate)
</script>

<template>
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" @click.self="close"
        role="dialog" aria-modal="true" aria-labelledby="payment-detail-title">
        <div ref="dialogRef" tabindex="-1"
            class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl outline-none">
            <div class="flex items-start justify-between gap-4 border-b p-5">
                <div>
                    <div class="flex flex-wrap items-center gap-2">
                        <h2 id="payment-detail-title" class="text-lg font-medium text-slate-700">
                            {{ t('paymentDetail.title') }}
                        </h2>
                        <span v-if="payment" :class="['rounded-full px-2.5 py-0.5 text-xs font-medium', statusClass]">
                            {{ statusLabel }}
                        </span>
                    </div>
                    <p class="text-sm text-slate-500">
                        {{ patientName }} · {{ doctorName }}
                    </p>
                    <p v-if="appointment?.slotDate" class="text-xs text-slate-400">
                        {{ appointment.slotDate }} {{ appointment.slotTime }}
                    </p>
                </div>
                <button ref="closeButtonRef" type="button" @click="close" :disabled="refunding"
                    class="text-2xl leading-none text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
                    :aria-label="t('paymentDetail.close')">
                    ×
                </button>
            </div>

            <div class="flex-1 overflow-y-auto p-5 space-y-5 text-sm text-slate-600">
                <p v-if="loading" class="py-8 text-center text-slate-400">
                    {{ t('paymentDetail.loading') }}
                </p>

                <div v-else-if="error" class="space-y-3">
                    <p role="alert" class="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                        {{ error }}
                    </p>
                    <button type="button" @click="loadPayment"
                        class="min-h-11 rounded border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
                        {{ t('paymentDetail.retry') }}
                    </button>
                </div>

                <div v-else-if="notFound" class="space-y-3">
                    <p role="alert" class="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
                        {{ t('paymentDetail.notFound') }}
                    </p>
                    <button type="button" @click="loadPayment"
                        class="min-h-11 rounded border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
                        {{ t('paymentDetail.retry') }}
                    </button>
                </div>

                <template v-else-if="payment">
                    <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <dt class="text-xs uppercase text-slate-400">{{ t('paymentDetail.amount') }}</dt>
                            <dd class="mt-1 font-medium text-slate-700">{{ formatMoney(amount) }}</dd>
                        </div>
                        <div>
                            <dt class="text-xs uppercase text-slate-400">{{ t('paymentDetail.method') }}</dt>
                            <dd class="mt-1 font-medium text-slate-700">{{ methodLabel }}</dd>
                        </div>
                        <div>
                            <dt class="text-xs uppercase text-slate-400">{{ t('paymentDetail.refundedAmount') }}</dt>
                            <dd class="mt-1 font-medium text-slate-700">{{ formatMoney(refundedAmount) }}</dd>
                        </div>
                        <div>
                            <dt class="text-xs uppercase text-slate-400">{{ t('paymentDetail.remaining') }}</dt>
                            <dd class="mt-1 font-medium text-slate-700">{{ formatMoney(remaining) }}</dd>
                        </div>
                        <div>
                            <dt class="text-xs uppercase text-slate-400">{{ t('paymentDetail.createdAt') }}</dt>
                            <dd class="mt-1 font-medium text-slate-700">{{ formatDate(payment.createdAt) }}</dd>
                        </div>
                        <div v-if="payment.paidAt">
                            <dt class="text-xs uppercase text-slate-400">{{ t('paymentDetail.paidAt') }}</dt>
                            <dd class="mt-1 font-medium text-slate-700">{{ formatDate(payment.paidAt) }}</dd>
                        </div>
                        <div v-if="payment.refundedAt">
                            <dt class="text-xs uppercase text-slate-400">{{ t('paymentDetail.refundedAt') }}</dt>
                            <dd class="mt-1 font-medium text-slate-700">{{ formatDate(payment.refundedAt) }}</dd>
                        </div>
                        <div v-if="payment.refundStatus">
                            <dt class="text-xs uppercase text-slate-400">{{ t('paymentDetail.refundStatus') }}</dt>
                            <dd class="mt-1 font-medium text-slate-700">{{ payment.refundStatus }}</dd>
                        </div>
                        <div v-if="payment.last4">
                            <dt class="text-xs uppercase text-slate-400">{{ t('paymentDetail.last4') }}</dt>
                            <dd class="mt-1 font-medium text-slate-700">•••• {{ payment.last4 }}</dd>
                        </div>
                        <div v-if="payment.stripeRefundId" class="sm:col-span-2">
                            <dt class="text-xs uppercase text-slate-400">{{ t('paymentDetail.stripeRefundId') }}</dt>
                            <dd class="mt-1 break-all font-mono text-xs text-slate-600">{{ payment.stripeRefundId }}</dd>
                        </div>
                    </dl>

                    <div v-if="payment.refundPendingAmount" class="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
                        {{ t('paymentDetail.refund.processing') }}
                    </div>

                    <form v-if="canRefund" class="space-y-3 rounded border border-slate-200 bg-slate-50 p-4"
                        @submit.prevent="submitRefund">
                        <p class="font-medium text-slate-700">{{ t('paymentDetail.refund.title') }}</p>
                        <p class="text-xs text-slate-500">
                            {{ t('paymentDetail.refund.hint', { amount: formatMoney(remaining) }) }}
                        </p>

                        <div>
                            <label for="refund-amount" class="mb-1 block text-xs uppercase text-slate-400">
                                {{ t('paymentDetail.refund.amountLabel') }}
                            </label>
                            <input id="refund-amount" v-model="refundAmount" type="number" min="0.01" step="0.01"
                                :max="remaining" inputmode="decimal"
                                class="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                        </div>

                        <p v-if="refundError" role="alert" class="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                            {{ refundError }}
                        </p>

                        <div class="flex justify-end">
                            <button type="submit" :disabled="refunding"
                                class="min-h-11 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                                {{ refunding ? t('paymentDetail.refund.submitting') : t('paymentDetail.refund.submit') }}
                            </button>
                        </div>
                    </form>

                    <p v-else-if="payment.status === 'paid' && remaining === 0" class="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                        {{ t('paymentDetail.refund.fullyRefunded') }}
                    </p>
                    <p v-else-if="payment.status !== 'paid'" class="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                        {{ t('paymentDetail.refund.notAvailable') }}
                    </p>
                </template>
            </div>

            <div class="flex justify-end border-t p-5">
                <button type="button" @click="close" :disabled="refunding"
                    class="min-h-11 rounded border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                    {{ t('paymentDetail.close') }}
                </button>
            </div>
        </div>
    </div>
</template>
