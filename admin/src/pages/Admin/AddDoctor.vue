<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAdminContext } from '../../context/AdminContext'
import { useToast } from 'vue-toastification'
import { assets } from '../../assets/assets'
import axios from 'axios'
import { useI18n } from 'vue-i18n'
import { translateSpeciality } from '../../utils/specialityUtils'

const { backendUrl, aToken } = useAdminContext()
const toast = useToast()
const { t } = useI18n()

const docImg = ref(null)
const docImgPreview = computed(() =>
    docImg.value ? URL.createObjectURL(docImg.value) : assets.upload_area
)

const experienceOptions = [
    { value: '1 Year', key: 'addDoctor.years.1' },
    { value: '2 Years', key: 'addDoctor.years.2' },
    { value: '3 Years', key: 'addDoctor.years.3' },
    { value: '4 Years', key: 'addDoctor.years.4' },
    { value: '5 Years', key: 'addDoctor.years.5' },
    { value: '6 Years', key: 'addDoctor.years.6' },
    { value: '7 Years', key: 'addDoctor.years.7' },
    { value: '8 Years', key: 'addDoctor.years.8' },
    { value: '9 Years', key: 'addDoctor.years.9' },
    { value: '+10 Years', key: 'addDoctor.years.10' },
]

const aboutOptions = [
    { value: 'doctorAbout.comprehensive', label: 'doctorAbout.comprehensive' },
]

const name = ref('')
const email = ref('')
const password = ref('')
const experience = ref('1 Year')
const fees = ref('')
const about = ref('doctorAbout.comprehensive')
const speciality = ref('')
const specialities = ref([])
const degree = ref('')
const address1 = ref('')
const address2 = ref('')

const onSubmitHandler = async (event) => {
    event.preventDefault()
    try {
        if (!docImg.value) {
            return toast.error('Image Not Selected')
        }

        const formData = new FormData()
        formData.append('image', docImg.value)
        formData.append('name', name.value)
        formData.append('email', email.value)
        formData.append('password', password.value)
        formData.append('experience', experience.value)
        formData.append('fees', Number(fees.value))
        formData.append('about', about.value)
        formData.append('speciality', speciality.value)
        formData.append('degree', degree.value)
        formData.append('address', JSON.stringify({ line1: address1.value, line2: address2.value }))

        // formData.forEach((value, key) => {
        //     console.log(`${key} : ${value}`)
        // })

        const { data } = await axios.post(
            backendUrl + '/api/admin/add-doctor',
            formData,
            { headers: { atoken: aToken.value } }
        )

        if (data.success) {
            toast.success(data.message)
            docImg.value = null
            name.value = ''
            email.value = ''
            password.value = ''
            experience.value = '1 Year'
            fees.value = ''
            about.value = 'doctorAbout.comprehensive'
            speciality.value = specialities.value[0]?.name ?? ''
            degree.value = ''
            address1.value = ''
            address2.value = ''
        } else {
            toast.error(data.message)
        }
    } catch (error) {
        toast.error(error.message)
        console.log(error)
    }
}

const loadSpecialities = async () => {
    try {
        const { data } = await axios.get(`${backendUrl}/api/specialities/names`)
        if (data.success) {
            specialities.value = data.specialities
            if (specialities.value.length > 0) {
                speciality.value = specialities.value[0].name
            }
        }
    } catch (error) {
        toast.error(t('addDoctor.noSpecialities'))
        console.error(error)
    }
}

onMounted(loadSpecialities)
</script>

<template>
    <form @submit="onSubmitHandler" class="m-5 w-full">
        <p class="mb-3 text-lg font-medium">{{ t('addDoctor.title') }}</p>
        <div class="bg-slate-100 px-8 py-8 border rounded w-full max-w-4xl max-h-screen overflow-y-scroll">
            <div class="flex items-center gap-4 mb-8 text-gray-500">
                <label for="doc-img" class="cursor-pointer">
                    <img class="w-16 bg-gray-100 rounded-full object-cover" :src="docImgPreview" alt="" />
                </label>
                <input @change="(e) => docImg = e.target.files[0]" type="file" id="doc-img" accept="image/*"
                    class="hidden" />
                <p>{{ t('addDoctor.uploadLabel') }} <br /> {{ t('addDoctor.uploadLabel2') }}</p>
            </div>

            <div class="flex flex-col lg:flex-row items-start gap-10 text-gray-600">
                <div class="w-full lg:flex-1 flex flex-col gap-4">
                    <div class="flex flex-col gap-1">
                        <p>{{ t('addDoctor.name') }}</p>
                        <input v-model="name" class="border rounded px-3 py-2" type="text"
                            :placeholder="t('addDoctor.name')" required />
                    </div>
                    <div class="flex flex-col gap-1">
                        <p>{{ t('addDoctor.email') }}</p>
                        <input v-model="email" class="border rounded px-3 py-2" type="email"
                            :placeholder="t('addDoctor.email')" required />
                    </div>
                    <div class="flex flex-col gap-1">
                        <p>{{ t('addDoctor.password') }}</p>
                        <input v-model="password" class="border rounded px-3 py-2" type="password"
                            :placeholder="t('addDoctor.password')" required />
                    </div>
                    <div class="flex flex-col gap-1">
                        <p>{{ t('addDoctor.experience') }}</p>
                        <select v-model="experience" class="border rounded px-3 py-2">
                            <option v-for="opt in experienceOptions" :key="opt.value" :value="opt.value">
                                {{ t(opt.key) }}
                            </option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1">
                        <p>{{ t('addDoctor.fees') }}</p>
                        <input v-model="fees" class="border rounded px-3 py-2" type="number"
                            :placeholder="t('addDoctor.fees')" required />
                    </div>
                </div>

                <div class="w-full lg:flex-1 flex flex-col gap-4">
                    <div class="flex flex-col gap-1">
                        <p>{{ t('addDoctor.speciality') }}</p>
                        <select :value="speciality" @change="speciality = $event.target.value"
                            class="border rounded px-3 py-2">
                            <option value="" disabled>{{ t('addDoctor.selectSpeciality') }}</option>
                            <option v-for="s in specialities" :key="s.slug" :value="s.name">
                                {{ translateSpeciality(s.name, t) }}
                            </option>
                        </select>
                        <p v-if="specialities.length === 0" class="text-xs text-red-400">
                            {{ t('addDoctor.noSpecialities') }}
                        </p>
                    </div>
                    <div class="flex flex-col gap-1">
                        <p>{{ t('addDoctor.education') }}</p>
                        <input v-model="degree" class="border rounded px-3 py-2" type="text"
                            :placeholder="t('addDoctor.degree')" required />
                    </div>
                    <div class="flex flex-col gap-1">
                        <p>{{ t('addDoctor.address') }}</p>
                        <input v-model="address1" class="border rounded px-3 py-2" type="text"
                            :placeholder="t('addDoctor.address1')" required />
                        <input v-model="address2" class="border rounded px-3 py-2" type="text"
                            :placeholder="t('addDoctor.address2')" required />
                    </div>
                </div>
            </div>

            <div>
                <p class="mt-4 mb-2">{{ t('addDoctor.about') }}</p>
                <select v-model="about" class="w-full px-3 py-2 border rounded" required>
                    <option value="" disabled>{{ t('addDoctor.about') }}</option>
                    <option v-for="opt in aboutOptions" :key="opt.value" :value="opt.value">
                        {{ t(opt.label) }}
                    </option>
                </select>
            </div>
            <button type="submit"
                class="bg-indigo-500 px-10 py-3 mt-4 text-white rounded-full cursor-pointer hover:bg-indigo-600 transition-colors">
                {{ t('addDoctor.addBtn') }}
            </button>
        </div>
    </form>
</template>