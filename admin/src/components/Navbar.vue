<script setup>
import { useAdminContext } from '../context/AdminContext';
import { assets } from '../assets/assets';

const { aToken, setAToken } = useAdminContext()

const logout = () => {
    if (aToken.value) {
        setAToken('')
        localStorage.removeItem('aToken')
    }
}
</script>

<template>
    <div class="flex justify-between items-center px-4 sm:px-10 py-3 border-b bg-indigo-100">
        <div class="flex items-center gap-2 text-xs">
            <img 
                class="w-36 sm:w-40 cursor-pointer"
                :src="assets.admin_logo" 
                alt=""
            />
            <p class="border px-2.5 py-0.5 rounded-full border-gray-500 text-slate-600">
                {{ aToken ? 'Admin' : 'Doctor' }}
            </p>
        </div>
        <button
            @click="logout"
            class="bg-indigo-500 text-white text-sm px-10 py-2 rounded-full cursor-pointer hover:bg-indigo-600 transition-colors"
        >
            Logout
        </button>
    </div>
</template>