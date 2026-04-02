import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../pages/Admin/Dashboard.vue'
import AllAppointments from '../pages/Admin/AllAppointments.vue'
import AddDoctor from '../pages/Admin/AddDoctor.vue'
import DoctorsList from '../pages/Admin/DoctorsList.vue'
import DoctorDashboard from '../pages/Doctor/DoctorDashboard.vue'
import DoctorAppointments from '../pages/Doctor/DoctorAppointments.vue'
import DoctorProfile from '../pages/Doctor/DoctorProfile.vue'
import ResetPassword from '../pages/ResetPassword.vue'
import SpecialitiesManager from '../pages/Admin/SpecialitiesManager.vue'

const routes = [
    {
        path: '/',
        redirect: '/admin-dashboard'
    },
    // Admin routes
    {
        path: '/admin-dashboard',
        name: 'Dashboard',
        component: Dashboard
    },
    {
        path: '/all-appointments',
        name: 'AllAppointments',
        component: AllAppointments
    },
    {
        path: '/add-doctor',
        name: 'AddDoctor',
        component: AddDoctor
    },
    {
        path: '/doctor-list',
        name: 'DoctorsList',
        component: DoctorsList
    },
    {
        path: '/specialities',
        name: 'SpecialitiesManager',
        component: SpecialitiesManager,
    },
    // Doctor routes
    {
        path: '/doctor-dashboard',
        name: 'DoctorDashboard',
        component: DoctorDashboard
    },
    {
        path: '/doctor-appointments',
        name: 'DoctorAppointments',
        component: DoctorAppointments
    },
    {
        path: '/doctor-profile',
        name: 'DoctorProfile',
        component: DoctorProfile
    },
    {
        path: '/reset-password',
        name: 'ResetPassword',
        component: ResetPassword,
    },
    {
        path: '/:pathMatch(.*)*',
        redirect: '/admin-dashboard'
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router