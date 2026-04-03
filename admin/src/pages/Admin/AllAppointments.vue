<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAdminContext } from '../../context/AdminContext';
import { useAppContext } from '../../context/AppContext';
import { assets } from '../../assets/assets';

const { aToken, appointments, getAllAppointments, cancelAppointment } = useAdminContext()
const { calculateAge, slotDateFormat, currency } = useAppContext()

const PAGE_SIZE = 8
const currentPage = ref(1)

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
        <p class="mb-3 text-lg font-medium">All Appointments</p>
        <div class="bg-slate-50 border rounded text-sm">
            <div
                class="hidden sm:grid grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] py-3 px-6 border-b font-medium text-gray-600">
                <p>#</p>
                <p>Patient</p>
                <p>Age</p>
                <p>Date &amp; Time</p>
                <p>Doctor</p>
                <p>Fees</p>
                <p>Actions</p>
            </div>

            <div v-for="(item, index) in paginatedAppointments" :key="item._id"
                class="flex flex-wrap justify-between max-sm:gap-2 sm:grid sm:grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] items-center text-gray-600 py-3 px-6 border-b hover:bg-gray-100">
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
                <p>{{ currency }}{{ item.amount }}</p>
                <div>
                    <p v-if="item.cancelled" class="text-red-400 text-xs font-medium">Cancelled</p>
                    <p v-else-if="item.isCompleted" class="text-green-500 text-xs font-medium">Completed</p>
                    <img v-else @click="cancelAppointment(item._id)" class="w-10 cursor-pointer"
                        :src="assets.cancel_icon" alt="Cancel appointment" title="Cancel appointment" />
                </div>
            </div>

            <p v-if="appointments.length === 0" class="text-center text-slate-400 py-16">
                No appointments found.
            </p>
        </div>

        <div v-if="totalPages > 1" class="flex items-center justify-center gap-1 mt-4">
            <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1"
                class="px-3 py-1.5 rounded border text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                Previous
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
                Next
            </button>
        </div>

        <p v-if="appointments.length > 0" class="text-center text-xs text-slate-400 mt-2">
            Showing {{ (currentPage - 1) * PAGE_SIZE + 1 }}–{{ Math.min(currentPage * PAGE_SIZE, appointments.length) }}
            of {{ appointments.length }} appointments
        </p>
    </div>
</template>