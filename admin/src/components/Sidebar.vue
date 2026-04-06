<script setup>
import { useAdminContext } from '../context/AdminContext'
import { RouterLink } from 'vue-router'
import { assets } from '../assets/assets'
import { useDoctorContext } from '../context/DoctorContext'
import { useI18n } from 'vue-i18n'

const { aToken } = useAdminContext()
const { dToken } = useDoctorContext()
const { t } = useI18n()

const adminNavItems = [
    { to: '/admin-dashboard', icon: assets.home_icon, label: 'Dashboard' },
    { to: '/all-appointments', icon: assets.appointment_icon, label: 'Appointments' },
    { to: '/add-doctor', icon: assets.add_icon, label: 'Add Doctor' },
    { to: '/doctor-list', icon: assets.people_icon, label: 'Doctors List' },
    { to: '/specialities', icon: assets.list_icon, label: 'Specialities' },
    { to: '/admin-reports', icon: assets.list_icon, label: 'Reports' },
    { to: '/admin-chat', icon: assets.appointment_icon, label: 'Live Chat' },
]

const doctorNavItems = [
    { to: '/doctor-dashboard', icon: assets.home_icon, label: 'Dashboard' },
    { to: '/doctor-appointments', icon: assets.appointment_icon, label: 'Appointments' },
    { to: '/doctor-profile', icon: assets.people_icon, label: 'Profile' },
    { to: '/doctor-reports', icon: assets.list_icon, label: 'Reports' },
]
</script>

<template>
    <div class="min-h-screen bg-indigo-100 border-r border-neutral-400">
        <ul v-if="aToken" class="text-neutral-500 mt-5">
            <RouterLink v-for="item in adminNavItems" :key="item.to" :to="item.to" v-slot="{ isActive }" custom>
                <li @click="$router.push(item.to)" :class="[
                    'flex items-center gap-3 py-3.5 px-3 md:px-9 md:min-w-72 cursor-pointer transition-colors',
                    isActive
                        ? 'bg-indigo-200 border-r-4 border-indigo-500 text-indigo-600'
                        : 'hover:bg-indigo-200 text-neutral-500'
                ]">
                    <img :src="item.icon" alt="" />
                    <p class="hidden sm:block">{{ item.label }}</p>
                </li>
            </RouterLink>
        </ul>
        <ul v-if="dToken" class="text-neutral-500 mt-5">
            <RouterLink v-for="item in doctorNavItems" :key="item.to" :to="item.to" v-slot="{ isActive }" custom>
                <li @click="$router.push(item.to)" :class="[
                    'flex items-center gap-3 py-3.5 px-3 md:px-9 md:min-w-72 cursor-pointer transition-colors',
                    isActive
                        ? 'bg-indigo-200 border-r-4 border-indigo-500 text-indigo-600'
                        : 'hover:bg-indigo-200 text-neutral-500'
                ]">
                    <img :src="item.icon" alt="" />
                    <p class="hidden sm:block">{{ item.label }}</p>
                </li>
            </RouterLink>
        </ul>
    </div>
</template>