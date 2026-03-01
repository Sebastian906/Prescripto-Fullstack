<script setup>
import { ref } from 'vue'
import { useAdminContext } from '../context/AdminContext'
import axios from 'axios'

const state = ref('Admin')
const email = ref('')
const password = ref('')

const {setAToken, backendUrl} = useAdminContext()

const onSubmitHandler = async (event) => {
    event.preventDefault()
    try {
        if (state.value === 'Admin') {
            const { data } = await axios.post(
                backendUrl + '/api/admin/login',
                { email: email.value, password: password.value }
            )
            if (data.success) {
                localStorage.setItem('aToken', data.token)
                setAToken(data.token)
            }
        }
    } catch (error) {
        console.error(error)
    }
}
</script>

<template>
    <form
        @submit="onSubmitHandler"
        class="min-h-[80vh] flex items-center"
    >
        <div class="flex flex-col gap-3 m-auto items-start p-8 min-w-85 sm:min-w-96 border rounded-xl text-[#5e5e5e] text-sm shadow-lg">
            <p class="text-2xl font-semibold m-auto">
                <span class="text-indigo-500"> {{ state }} </span> Login
            </p>
            <div class="w-full">
                <p>Email</p>
                <input
                    v-model="email"
                    class="border border-[#dadada] rounded w-full p-2 mt-1"
                    type="email"
                    required
                />
            </div>
            <div class="w-full">
                <p>Password</p>
                <input
                    v-model="password"
                    class="border border-[#dadada] rounded w-full p-2 mt-1"
                    type="password"
                    required
                />
            </div>
            <button class="bg-indigo-500 text-slate-50 w-full py-2 rounded-md text-base">
                Login
            </button>
            <p v-if="state === 'Admin'">
                Doctor Login?
                <span
                    class="text-indigo-500 underline cursor-pointer"
                    @click="state = 'Doctor'"
                >
                    Click here
                </span>
            </p>
            <p v-else>
                Admin Login?
                <span
                    class="text-indigo-500 underline cursor-pointer"
                    @click="state = 'Admin'"
                >
                    Click here
                </span>
            </p>
        </div>
    </form>
</template>