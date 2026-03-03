<script setup>
import { onMounted } from 'vue'
import { useAdminContext } from '../../context/AdminContext'

const { doctors, aToken, getAllDoctors, changeAvailability } = useAdminContext()

onMounted(() => {
    if (aToken.value) {
        getAllDoctors()
    }
})
</script>

<template>
    <div class="m-5 max-h-[90vh] overflow-y-scroll w-full">
        <h1 class="text-lg font-medium">All Doctors</h1>
        <div class="w-full flex flex-wrap gap-4 pt-5 gap-y-6">
            <div v-for="(item, index) in doctors" :key="index"
                class="border border-indigo-400 rounded-xl max-w-56 overflow-hidden cursor-pointer group">
                <img class="bg-indigo-50 group-hover:bg-indigo-200 transition-all duration-500 w-full object-cover"
                    :src="item.image" :alt="item.name" />
                <div class="p-4">
                    <p class="text-neutral-800 text-lg font-medium">{{ item.name }}</p>
                    <p class="text-zinc-600 text-sm">{{ item.speciality }}</p>
                    <div class="mt-2 flex items-center gap-1 text-sm">
                        <input type="checkbox" :checked="item.available" @change="changeAvailability(item._id)" />
                        <p>Available</p>
                    </div>
                </div>
            </div>
        </div>
        <p v-if="doctors.length === 0" class="text-slate-500 mt-6 text-sm">
            No doctors registered yet.
        </p>
    </div>
</template>