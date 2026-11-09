<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAdminContext } from '../../context/AdminContext';
import { useAppContext } from '../../context/AppContext';
import { assets } from '../../assets/assets';
import { useI18n } from 'vue-i18n';
import PaymentDetailModal from '../../components/PaymentDetailModal.vue';

const { aToken, appointments, getAllAppointments, cancelAppointment } = useAdminContext()
const { calculateAge, slotDateFormat, currency } = useAppContext()
const { t } = useI18n()

const PAGE_SIZE = 8
const currentPage = ref(1)
const paymentTarget = ref(null)

/** Open the payment detail for the selected appointment. */
const openPayment = (item) => {
    paymentTarget.value = item
}

/** Close the payment detail dialog. */
const closePayment = () => {
    paymentTarget.value = null
}

/** Reflect the refunded row immediately, then re-sync the full list. */
const handleRefunded = async (updatedPayment) => {
    if (paymentTarget.value && updatedPayment) {
        paymentTarget.value.payment = updatedPayment.status !== 'refunded'
    }
    await getAllAppointments()
}

/** Confirm before cancelling an appointment whose payment is still active. */
const requestCancel = (item) => {
    if (item.payment && !window.confirm(t('allAppointments.cancelPaidWarning'))) return
    cancelAppointment(item._id)
}

const totalPages = computed(() => Math.ceil(appointments.value.length / PAGE_SIZE))

const paginatedAppointments = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return appointments.value.slice(start, start + PAGE_SIZE)
})

const pageNumbers = computed(() => {
    return Array.from({ length: totalPages.value }, (_, i) => i + 1)
})

const goToPage = (page) => {
    if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

onMounted(() => {
    if (aToken.value) {
        getAllAppointments()
    }
})
</script>

<template>
    <div class="w-full max-w-6xl m-5">
        <p class="mb-3 text-lg font-medium">{{ t('allAppointments.title') }}</p>
        <div class="bg-slate-50 border rounded text-sm">
            <div
                class="hidden sm:grid grid-cols-[0.5fr_2.5fr_0.8fr_2.5fr_2.5fr_1fr_1fr_1fr] py-3 px-6 border-b font-medium text-gray-600">
                <p>#</p>
                <p>{{ t('allAppointments.patient') }}</p>
                <p>{{ t('allAppointments.age') }}</p>
                <p>{{ t('allAppointments.dateTime') }}</p>
                <p>{{ t('allAppointments.doctor') }}</p>
                <p>{{ t('allAppointments.payment') }}</p>
                <p>{{ t('allAppointments.fees') }}</p>
                <p>{{ t('allAppointments.actions') }}</p>
            </div>

            <div v-for="(item, index) in paginatedAppointments" :key="item._id"
                class="flex flex-wrap justify-between max-sm:gap-2 sm:grid sm:grid-cols-[0.5fr_2.5fr_0.8fr_2.5fr_2.5fr_1fr_1fr_1fr] items-center text-gray-600 py-3 px-6 border-b hover:bg-gray-100">
                <p class="max-sm:hidden">{{ (currentPage - 1) * PAGE_SIZE + index + 1 }}</p>
                <div class="flex items-center gap-2">
                    <img class="w-8 h-8 rounded-full object-cover" :src="item.userData.image"
                        :alt="item.userData.name" />
                    <p>{{ item.userData.name }}</p>
                </div>
                <p class="max-sm:hidden">{{ calculateAge(item.userData.dob) }}</p>
                <p>{{ slotDateFormat(item.slotDate) }}, {{ item.slotTime }}</p>
                <div class="flex items-center gap-2">
                    <img class="w-8 h-8 rounded-full object-cover bg-gray-200" :src="item.docData.image"
                        :alt="item.docData.name" />
                    <p>{{ item.docData.name }}</p>
                </div>
                <p :class="item.payment ? 'text-emerald-600 text-xs font-medium' : 'text-amber-600 text-xs font-medium'">
                    {{ item.payment ? t('allAppointments.paid') : t('allAppointments.unpaid') }}
                </p>
                <p>{{ currency }}{{ item.amount }}</p>
                <div class="flex flex-wrap items-center gap-2">
                    <p v-if="item.cancelled" class="text-red-400 text-xs font-medium">{{ t('allAppointments.cancelled')
                        }}</p>
                    <p v-else-if="item.isCompleted" class="text-green-500 text-xs font-medium">{{
                        t('allAppointments.completed') }}</p>
                    <img v-else @click="requestCancel(item)" class="w-10 cursor-pointer"
                        :src="assets.cancel_icon" alt="Cancel" />
                    <button type="button" @click="openPayment(item)"
                        class="min-h-9 rounded border px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 cursor-pointer">
                        {{ t('allAppointments.viewPayment') }}
                    </button>
                </div>
            </div>

            <p v-if="appointments.length === 0" class="text-center text-slate-400 py-16">
                {{ t('allAppointments.noAppointments') }}
            </p>
        </div>

        <div v-if="totalPages > 1" class="flex items-center justify-center gap-1 mt-4">
            <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1"
                class="px-3 py-1.5 rounded border text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                {{ t('allAppointments.previous') }}
            </button>
            <button v-for="page in pageNumbers" :key="page" @click="goToPage(page)" :class="[
                'px-3 py-1.5 rounded border text-sm transition-colors cursor-pointer',
                page === currentPage ? 'bg-indigo-500 text-white border-indigo-500' : 'text-slate-600 hover:bg-slate-100'
            ]">{{ page }}</button>
            <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages"
                class="px-3 py-1.5 rounded border text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                {{ t('allAppointments.next') }}
            </button>
        </div>

        <p v-if="appointments.length > 0" class="text-center text-xs text-slate-400 mt-2">
            {{ t('allAppointments.showing') }}
            {{ (currentPage - 1) * PAGE_SIZE + 1 }}–{{ Math.min(currentPage * PAGE_SIZE, appointments.length) }}
            {{ t('allAppointments.of') }} {{ appointments.length }} {{ t('allAppointments.appointments') }}
        </p>

        <PaymentDetailModal :open="!!paymentTarget" :appointment="paymentTarget || {}" @close="closePayment"
            @refunded="handleRefunded" />
    </div>
</template>