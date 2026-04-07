<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminContext } from '../../context/AdminContext'
import { useSort } from '../../composables/useSort.vue'

const { doctors, aToken, getAllDoctors, changeAvailability } = useAdminContext()
const { t } = useI18n()
const selectedSpeciality = ref('')

const filteredDoctors = computed(() => {
    if (!selectedSpeciality.value) return doctors.value
    return doctors.value.filter(
        (d) => d.speciality === selectedSpeciality.value,
    )
})

const specialities = computed(() => {
    const unique = [...new Set(doctors.value.map((d) => d.speciality).filter(Boolean))]
    return unique.sort((a, b) => a.localeCompare(b))
})

const { sortedDoctors, sortOption, SORT_OPTIONS } = useSort(filteredDoctors)

onMounted(() => {
    if (aToken.value) {
        getAllDoctors()
    }
})
</script>

<template>
    <div class="m-5 max-h-[90vh] overflow-y-scroll w-full">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h1 class="text-lg font-medium">{{ t('doctorsList.title') }}</h1>
            <div class="flex flex-wrap items-center gap-3">
                <div class="flex items-center gap-2">
                    <label class="text-sm text-slate-500 shrink-0">{{ t('doctorsList.specialityLabel') }}</label>
                    <select v-model="selectedSpeciality"
                        class="text-sm border border-slate-500 rounded px-3 py-1.5 text-slate-600 bg-indigo-50 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer">
                        <option value="">{{ t('doctorsList.all') }}</option>
                        <option v-for="spec in specialities" :key="spec" :value="spec">
                            {{ spec }}
                        </option>
                    </select>
                </div>
                <div class="flex items-center gap-2">
                    <label class="text-sm text-slate-500 shrink-0">{{ t('doctorsList.sortBy') }}</label>
                    <select v-model="sortOption"
                        class="text-sm border border-slate-500 rounded px-3 py-1.5 text-slate-600 bg-indigo-50 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer">
                        <option v-for="opt in SORT_OPTIONS" :key="opt.value" :value="opt.value">
                            {{ opt.label }}
                        </option>
                    </select>
                </div>
                <span class="text-xs text-slate-400">
                    {{ sortedDoctors.length }} {{ sortedDoctors.length !== 1 ? t('doctorsList.doctors') :
                        t('doctorsList.doctor') }}
                </span>
            </div>
        </div>
        <div class="w-full flex flex-wrap gap-4 pt-2 gap-y-6">
            <div v-for="(item, index) in sortedDoctors" :key="item._id ?? index"
                class="border border-indigo-400 rounded-xl max-w-56 overflow-hidden cursor-pointer group">
                <img class="bg-indigo-50 group-hover:bg-indigo-200 transition-all duration-500 w-full object-cover"
                    :src="item.image" :alt="item.name" />
                <div class="p-4">
                    <p class="text-neutral-800 text-lg font-medium">{{ item.name }}</p>
                    <p class="text-zinc-600 text-sm">{{ item.speciality }}</p>
                    <div class="mt-2 flex items-center gap-1 text-sm">
                        <input type="checkbox" :checked="item.available" @change="changeAvailability(item._id)" />
                        <p>{{ t('doctorsList.available') }}</p>
                    </div>
                </div>
            </div>
        </div>
        <p v-if="sortedDoctors.length === 0" class="text-slate-500 mt-6 text-sm">
            {{ t('doctorsList.noDoctors') }}
        </p>
    </div>
</template>