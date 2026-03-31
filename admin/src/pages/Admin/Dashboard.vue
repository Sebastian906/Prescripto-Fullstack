<script setup>
import { onMounted } from 'vue'
import { useAdminContext } from '../../context/AdminContext'
import { useAppContext } from '../../context/AppContext'
import { assets } from '../../assets/assets'

const { aToken, dashData, getDashData, cancelAppointment } = useAdminContext()
const { slotDateFormat } = useAppContext()

const statCards = [
    { key: 'doctors',      label: 'Doctors',      icon: assets.doctor_icon },
    { key: 'appointments', label: 'Appointments',  icon: assets.appointments_icon },
    { key: 'patients',     label: 'Patients',      icon: assets.patients_icon },
]

onMounted(() => {
    if (aToken.value) {
        getDashData()
    }
})
</script>

<template>
    <div v-if="dashData" class="m-5 w-4xl">
        <div class="flex flex-wrap gap-3">
            <div
                v-for="card in statCards"
                :key="card.key"
                class="flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-200 cursor-pointer hover:scale-105 transition-all"
            >
                <img class="w-14" :src="card.icon" :alt="card.label" />
                <div>
                    <p class="text-xl font-semibold text-gray-600">{{ dashData[card.key] }}</p>
                    <p class="text-sm text-gray-400 underline">{{ card.label }}</p>
                </div>
            </div>
        </div>
        <div class="bg-slate-100 mt-10 rounded border">
            <div class="flex items-center gap-2.5 px-4 py-4 border-b">
                <img :src="assets.list_icon" alt="" />
                <p class="font-semibold">Latest Bookings</p>
            </div>
            <div>
                <div
                    v-for="(item, index) in dashData.latestAppointments"
                    :key="item._id ?? index"
                    class="flex items-center px-6 py-3 gap-3 hover:bg-gray-200 transition-colors"
                >
                    <img
                        class="rounded-full w-10 h-10 object-cover bg-gray-200"
                        :src="item.docData.image"
                        :alt="item.docData.name"
                    />
                    <div class="flex-1 text-sm">
                        <p class="text-gray-800 font-medium">{{ item.docData.name }}</p>
                        <p class="text-gray-500">{{ slotDateFormat(item.slotDate) }}</p>
                    </div>
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
        </div>
    </div>

    <div v-else class="flex items-center justify-center h-64 text-slate-400 text-sm">
        Loading dashboard…
    </div>
</template>