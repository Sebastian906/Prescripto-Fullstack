<script setup>
import { ref, computed } from 'vue'
import { useAdminContext } from '../../context/AdminContext'
import { useToast } from 'vue-toastification'
import { assets } from '../../assets/assets'
import axios from 'axios'

const { backendUrl, aToken } = useAdminContext()
const toast = useToast()

const docImg = ref(null)
const docImgPreview = computed(() =>
    docImg.value ? URL.createObjectURL(docImg.value) : assets.upload_area
)

const name = ref('')
const email = ref('')
const password = ref('')
const experience = ref('1 Year')
const fees = ref('')
const about = ref('')
const speciality = ref('General Physician')
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

        formData.forEach((value, key) => {
            console.log(`${key} : ${value}`)
        })

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
            about.value = ''
            speciality.value = 'General Physician'
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
</script>

<template>
    <form @submit="onSubmitHandler" class="m-5 w-full">
        <p class="mb-3 text-lg font-medium">Add Doctor</p>
        <div class="bg-slate-100 px-8 py-8 border rounded w-full max-w-4xl max-h-screen overflow-y-scroll">
            <div class="flex items-center gap-4 mb-8 text-gray-500">
                <label for="doc-img" class="cursor-pointer">
                    <img
                        class="w-16 bg-gray-100 rounded-full object-cover"
                        :src="docImgPreview"
                        alt=""
                    />
                </label>
                <input
                    @change="(e) => docImg = e.target.files[0]"
                    type="file"
                    id="doc-img"
                    accept="image/*"
                    class="hidden"
                />
                <p>Upload doctor <br /> picture</p>
            </div>

            <div class="flex flex-col lg:flex-row items-start gap-10 text-gray-600">
                <div class="w-full lg:flex-1 flex flex-col gap-4">
                    <div class="flex flex-col gap-1">
                        <p>Doctor Name</p>
                        <input
                            v-model="name"
                            class="border rounded px-3 py-2"
                            type="text"
                            placeholder="Name"
                            required
                        />
                    </div>
                    <div class="flex flex-col gap-1">
                        <p>Doctor Email</p>
                        <input
                            v-model="email"
                            class="border rounded px-3 py-2"
                            type="email"
                            placeholder="Email"
                            required
                        />
                    </div>
                    <div class="flex flex-col gap-1">
                        <p>Doctor Password</p>
                        <input
                            v-model="password"
                            class="border rounded px-3 py-2"
                            type="password"
                            placeholder="Password"
                            required
                        />
                    </div>
                    <div class="flex flex-col gap-1">
                        <p>Experience</p>
                        <select v-model="experience" class="border rounded px-3 py-2">
                            <option value="1 Year">1 Year</option>
                            <option value="2 Years">2 Years</option>
                            <option value="3 Years">3 Years</option>
                            <option value="4 Years">4 Years</option>
                            <option value="5 Years">5 Years</option>
                            <option value="6 Years">6 Years</option>
                            <option value="7 Years">7 Years</option>
                            <option value="8 Years">8 Years</option>
                            <option value="9 Years">9 Years</option>
                            <option value="+10 Years">+10 Years</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1">
                        <p>Fees</p>
                        <input
                            v-model="fees"
                            class="border rounded px-3 py-2"
                            type="number"
                            placeholder="Fees"
                            required
                        />
                    </div>
                </div>

                <div class="w-full lg:flex-1 flex flex-col gap-4">
                    <div class="flex flex-col gap-1">
                        <p>Speciality</p>
                        <select v-model="speciality" class="border rounded px-3 py-2">
                            <option value="General Physician">General Physician</option>
                            <option value="Gynecologist">Gynecologist</option>
                            <option value="Dermatologist">Dermatologist</option>
                            <option value="Pediatrician">Pediatrician</option>
                            <option value="Neurologist">Neurologist</option>
                            <option value="Gastroenterologist">Gastroenterologist</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1">
                        <p>Education</p>
                        <input
                            v-model="degree"
                            class="border rounded px-3 py-2"
                            type="text"
                            placeholder="Degree"
                            required
                        />
                    </div>
                    <div class="flex flex-col gap-1">
                        <p>Address</p>
                        <input
                            v-model="address1"
                            class="border rounded px-3 py-2"
                            type="text"
                            placeholder="Address 1"
                            required
                        />
                        <input
                            v-model="address2"
                            class="border rounded px-3 py-2"
                            type="text"
                            placeholder="Address 2"
                            required
                        />
                    </div>
                </div>
            </div>

            <div>
                <p class="mt-4 mb-2">About Doctor</p>
                <textarea
                    v-model="about"
                    class="w-full px-4 pt-2 border rounded"
                    placeholder="Write about doctor"
                    rows="5"
                    required
                />
            </div>
            <button
                type="submit"
                class="bg-indigo-500 px-10 py-3 mt-4 text-white rounded-full cursor-pointer hover:bg-indigo-600 transition-colors"
            >
                Add Doctor
            </button>
        </div>
    </form>
</template>