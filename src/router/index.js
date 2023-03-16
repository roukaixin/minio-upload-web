import { createRouter,createWebHashHistory } from "vue-router"

const routes = [
    {
        path: '/',
        component: () => import("../components/MinioUpload")
    }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes,
})

export default router