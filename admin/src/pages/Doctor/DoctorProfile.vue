<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDoctorContext } from '../../context/DoctorContext'
import { useAppContext } from '../../context/AppContext'

const { dToken, profileData, getProfileData, updateProfileData } = useDoctorContext()
const { currency } = useAppContext()
const { t } = useI18n()

const isEdit = ref(false)

const localFees = ref(0)
const localAddress = ref({ line1: '', line2: '' })
const localAvailable = ref(false)

const startEdit = () => {
    localFees.value = profileData.value?.fees
    // If address is missing, use a safe default object
    localAddress.value = profileData.value?.address
        ? { ...profileData.value.address }
        : { line1: '', line2: '' }
    localAvailable.value = profileData.value?.available ?? false
    isEdit.value = true
}

const saveProfile = async () => {
    await updateProfileData({
        fees: localFees.value,
        address: localAddress.value,
        available: localAvailable.value,
    })
    isEdit.value = false
}

onMounted(() => {
    if (dToken.value) {
        getProfileData()
    }
})
</script>

<template>
    <div v-if="profileData && profileData.address" class="flex flex-col gap-4 m-5">
        <div>
            <img class="bg-indigo-500/80 w-full sm:max-w-64 rounded-lg object-cover" :src="profileData.image"
                :alt="profileData.name" />
        </div>

        <div class="flex-1 border border-stone-200 rounded-lg p-8 py-7 bg-indigo-50">
            <p class="text-3xl font-medium text-gray-700">{{ profileData.name }}</p>

            <div class="flex items-center gap-2 mt-1 text-gray-600">
                <p>{{ profileData.degree }} - {{ profileData.speciality }}</p>
                <button class="py-0.5 px-2 border text-xs rounded-full">
                    {{ profileData.experience }}
                </button>
            </div>

            <div class="mt-3">
                <p class="text-sm font-medium text-neutral-800">{{ t('doctorProfile.about') }}</p>
                <p class="text-sm text-gray-600 max-w-175 mt-1">{{ profileData.about }}</p>
            </div>

            <p class="text-gray-600 font-medium mt-4">
                {{ t('doctorProfile.appointmentFee') }}
                <span class="text-gray-800 ml-1">{{ currency }}
                    <template v-if="isEdit">
                        <input v-model.number="localFees" type="number"
                            class="border border-slate-300 rounded px-2 py-0.5 w-24 ml-1" />
                    </template>
                    <template v-else>{{ profileData.fees }}</template>
                </span>
            </p>

            <div class="flex gap-2 py-2 text-gray-600">
                <p class="font-medium shrink-0">{{ t('doctorProfile.address') }}</p>
                <div class="text-sm flex flex-col gap-1">
                    <template v-if="isEdit">
                        <input v-model="localAddress.line1" type="text" :placeholder="t('doctorProfile.addressLine1')"
                            class="border border-slate-300 rounded px-2 py-0.5" />
                        <input v-model="localAddress.line2" type="text" :placeholder="t('doctorProfile.addressLine2')"
                            class="border border-slate-300 rounded px-2 py-0.5" />
                    </template>
                    <template v-else>
                        <p>{{ profileData.address?.line1 }}</p>
                        <p>{{ profileData.address?.line2 }}</p>
                    </template>
                </div>
            </div>

            <div class="flex items-center gap-2 pt-2">
                <input type="checkbox" id="available" :checked="isEdit ? localAvailable : profileData.available"
                    :disabled="!isEdit" @change="isEdit && (localAvailable = !localAvailable)" />
                <label for="available" class="text-gray-600 text-sm">{{ t('doctorProfile.available') }}</label>
            </div>

            <button v-if="isEdit" @click="saveProfile"
                class="px-4 py-1 border border-indigo-500 text-sm rounded-full mt-5 hover:bg-indigo-500 hover:text-white transition-all cursor-pointer">
                {{ t('doctorProfile.save') }}
            </button>
            <button v-else @click="startEdit"
                class="px-4 py-1 border border-indigo-500 text-sm rounded-full mt-5 hover:bg-indigo-500 hover:text-white transition-all cursor-pointer">
                {{ t('doctorProfile.edit') }}
            </button>
        </div>
    </div>

    <div v-else class="flex items-center justify-center h-64 text-slate-400 text-sm">
        {{ t('doctorProfile.loading') }}
    </div>
</template>