<script setup>
import { useAdminContext } from './context/AdminContext'
import { RouterView } from 'vue-router'
import Navbar from './components/Navbar.vue'
import Login from './pages/Login.vue'
import Sidebar from './components/Sidebar.vue'
import { useDoctorContext } from './context/DoctorContext'

const { aToken } = useAdminContext()
const { dToken } = useDoctorContext()
</script>

<template>
    <div v-if="aToken || dToken" class="bg-indigo-100 min-h-screen">
        <Navbar />
        <div class="flex items-start">
            <Sidebar />
            <RouterView />
        </div>
    </div>
    <div v-else>
        <Login />
    </div>
</template>