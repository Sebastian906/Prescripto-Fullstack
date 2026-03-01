import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../pages/Admin/Dashboard.vue'
import AllAppointments from '../pages/Admin/AllAppointments.vue'
import AddDoctor from '../pages/Admin/AddDoctor.vue'
import DoctorsList from '../pages/Admin/DoctorsList.vue'

const routes = [
    {
        path: '/',
        redirect: '/admin-dashboard'
    },
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
        path: '/:pathMatch(.*)*',
        redirect: '/admin-dashboard'
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router