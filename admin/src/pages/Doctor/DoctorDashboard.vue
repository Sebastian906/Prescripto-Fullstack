<script setup>
import { onMounted } from 'vue'
import { useDoctorContext } from '../../context/DoctorContext'
import { useAppContext } from '../../context/AppContext'
import { assets } from '../../assets/assets'

const { dToken, dashData, getDashData, completeAppointment, cancelAppointment } = useDoctorContext()
const { currency, slotDateFormat } = useAppContext()

const statCards = [
    { key: 'earnings',     label: 'Earnings',     icon: assets.earning_icon,      prefix: currency },
    { key: 'appointments', label: 'Appointments',  icon: assets.appointments_icon, prefix: ''       },
    { key: 'patients',     label: 'Patients',      icon: assets.patients_icon,     prefix: ''       },
]

onMounted(() => {
    if (dToken.value) {
        getDashData()
    }
})
</script>

<template>
    <div v-if="dashData" class="m-5">
        <div class="flex flex-wrap gap-3">
            <div
                v-for="card in statCards"
                :key="card.key"
                class="flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-200 cursor-pointer hover:scale-105 transition-all"
            >
                <img class="w-14" :src="card.icon" :alt="card.label" />
                <div>
                    <p class="text-xl font-semibold text-gray-600">
                        {{ card.prefix }}{{ dashData[card.key] }}
                    </p>
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
                        :src="item.userData.image"
                        :alt="item.userData.name"
                    />
                    <div class="flex-1 text-sm">
                        <p class="text-gray-800 font-medium">{{ item.userData.name }}</p>
                        <p class="text-gray-500">{{ slotDateFormat(item.slotDate) }}</p>
                    </div>
                    <p v-if="item.cancelled"   class="text-red-500 text-xs font-medium">Cancelled</p>
                    <p v-else-if="item.isCompleted" class="text-green-500 text-xs font-medium">Completed</p>
                    <template v-else>
                        <img
                            @click="cancelAppointment(item._id)"
                            class="w-10 cursor-pointer"
                            :src="assets.cancel_icon"
                            alt="Cancel"
                            title="Cancel appointment"
                        />
                        <img
                            @click="completeAppointment(item._id)"
                            class="w-10 cursor-pointer"
                            :src="assets.tick_icon"
                            alt="Complete"
                            title="Mark as completed"
                        />
                    </template>
                </div>
            </div>
        </div>
    </div>

    <div v-else class="flex items-center justify-center h-64 text-slate-400 text-sm">
        Loading dashboard…
    </div>
</template>