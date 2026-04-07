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
    { to: '/admin-dashboard', icon: assets.home_icon, labelKey: 'sidebar.dashboard' },
    { to: '/all-appointments', icon: assets.appointment_icon, labelKey: 'sidebar.appointments' },
    { to: '/add-doctor', icon: assets.add_icon, labelKey: 'sidebar.addDoctor' },
    { to: '/doctor-list', icon: assets.people_icon, labelKey: 'sidebar.doctorsList' },
    { to: '/specialities', icon: assets.list_icon, labelKey: 'sidebar.specialities' },
    { to: '/admin-reports', icon: assets.list_icon, labelKey: 'sidebar.reports' },
    { to: '/admin-chat', icon: assets.appointment_icon, labelKey: 'sidebar.liveChat' },
]

const doctorNavItems = [
    { to: '/doctor-dashboard', icon: assets.home_icon, labelKey: 'sidebar.dashboard' },
    { to: '/doctor-appointments', icon: assets.appointment_icon, labelKey: 'sidebar.appointments' },
    { to: '/doctor-profile', icon: assets.people_icon, labelKey: 'sidebar.profile' },
    { to: '/doctor-reports', icon: assets.list_icon, labelKey: 'sidebar.reports' },
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
                    <p class="hidden sm:block">{{ t(item.labelKey) }}</p>
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
                    <p class="hidden sm:block">{{ t(item.labelKey) }}</p>
                </li>
            </RouterLink>
        </ul>
    </div>
</template>