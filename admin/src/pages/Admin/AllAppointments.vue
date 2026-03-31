<script setup>
import { onMounted } from 'vue';
import { useAdminContext } from '../../context/AdminContext';
import { useAppContext } from '../../context/AppContext';
import { assets } from '../../assets/assets';

const { aToken, appointments, getAllAppointments, cancelAppointment } = useAdminContext()
const { calculateAge, slotDateFormat, currency } = useAppContext()

onMounted(() => {
    if (aToken.value) {
        getAllAppointments()
    }
})
</script>

<template>
    <div class="w-full max-w-6xl m-5">
        <p class="mb-3 text-lg font-medium">All Appointments</p>
        <div class="bg-slate-50 border rounded text-sm max-h-[80vh] min-h-[70vh] overflow-y-scroll">
            <div class="hidden sm:grid grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] py-3 px-6 border-b font-medium text-gray-600">
                <p>#</p>
                <p>Patient</p>
                <p>Age</p>
                <p>Date &amp; Time</p>
                <p>Doctor</p>
                <p>Fees</p>
                <p>Actions</p>
            </div>
            <div
                v-for="(item, index) in appointments"
                :key="item._id"
                class="flex flex-wrap justify-between max-sm:gap-2 sm:grid sm:grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] items-center text-gray-600 py-3 px-6 border-b hover:bg-gray-100"
            >
                <p class="max-sm:hidden">{{ index + 1 }}</p>
                <div class="flex items-center gap-2">
                    <img
                        class="w-8 h-8 rounded-full object-cover"
                        :src="item.userData.image"
                        :alt="item.userData.name"
                    />
                    <p>{{ item.userData.name }}</p>
                </div>
                <p class="max-sm:hidden">{{ calculateAge(item.userData.dob) }}</p>
                <p>{{ slotDateFormat(item.slotDate) }}, {{ item.slotTime }}</p>
                <div class="flex items-center gap-2">
                    <img
                        class="w-8 h-8 rounded-full object-cover bg-gray-200"
                        :src="item.docData.image"
                        :alt="item.docData.name"
                    />
                    <p>{{ item.docData.name }}</p>
                </div>
                <p>{{ currency }}{{ item.amount }}</p>
                <div>
                    <p
                        v-if="item.cancelled"
                        class="text-red-400 text-xs font-medium"
                    >
                        Cancelled
                    </p>
                    <p
                        v-else-if="item.isCompleted"
                        class="text-green-500 text-xs font-medium"
                    >
                        Completed
                    </p>
                    <img
                        v-else
                        @click="cancelAppointment(item._id)"
                        class="w-10 cursor-pointer"
                        :src="assets.cancel_icon"
                        alt="Cancel appointment"
                        title="Cancel appointment"
                    />
                </div>
            </div>
            <p
                v-if="appointments.length === 0"
                class="text-center text-slate-400 py-16"
            >
                No appointments found.
            </p>
        </div>
    </div>
</template>