import { createRouter, createWebHistory } from 'vue-router'

const routes = [
    {
        path: '/',
        component: { template: '<div></div>' }
    },
    {
        path: '/:pathMatch(.*)*',
        redirect: '/'
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router