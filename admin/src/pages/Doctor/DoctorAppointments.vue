<script setup>
import { useDoctorContext } from '../../context/DoctorContext'
import { useAppContext } from '../../context/AppContext'
import { onMounted } from 'vue'
import { assets } from '../../assets/assets'

const { dToken, appointments, getAppointments } = useDoctorContext()
const { calculateAge, slotDateFormat, currency } = useAppContext()

onMounted(() => {
    if (dToken.value) {
        getAppointments()
    }
})
</script>

<template>
    <div class="w-full max-w-6xl m-5">
        <p class="mb-3 text-lg font-medium">All Appointments</p>
        <div class="bg-slate-100 border rounded text-sm max-h-[80vh] min-h-[50vh] overflow-y-scroll">
            <div class="hidden sm:grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-1 py-3 px-6 border-b font-medium text-gray-600">
                <p>#</p>
                <p>Patient</p>
                <p>Payment</p>
                <p>Age</p>
                <p>Date &amp; Time</p>
                <p>Fees</p>
                <p>Action</p>
            </div>
            <div
                v-for="(item, index) in appointments"
                :key="item._id"
                class="flex flex-wrap justify-between max-sm:gap-5 max-sm:text-base sm:grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-1 items-center text-gray-500 py-3 px-6 border-b hover:bg-gray-200"
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
                <p>{{ item.payment ? 'Online' : 'CASH' }}</p>
                <p class="max-sm:hidden">{{ calculateAge(item.userData.dob) }}</p>
                <p>{{ slotDateFormat(item.slotDate) }}, {{ item.slotTime }}</p>
                <p>{{ currency }}{{ item.amount }}</p>
                <div class="flex items-center gap-1">
                    <img
                        class="w-10 cursor-pointer"
                        :src="assets.cancel_icon"
                        alt="Cancel"
                        title="Cancel appointment"
                    />
                    <img
                        class="w-10 cursor-pointer"
                        :src="assets.tick_icon"
                        alt="Complete"
                        title="Mark as completed"
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