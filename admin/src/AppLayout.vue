<script setup>
import { useAdminContext } from './context/AdminContext'
import { RouterView } from 'vue-router'
import Navbar from './components/Navbar.vue'
import Login from './pages/Login.vue'

const { aToken } = useAdminContext()
</script>

<template>
    <div v-if="aToken" class="bg-indigo-100 min-h-screen">
        <Navbar />
        <RouterView />
    </div>
    <div v-else>
        <Login />
    </div>
</template>