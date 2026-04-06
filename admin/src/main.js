import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './routes/index.js'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import i18n from './i18n/index.js'

const app = createApp(App)

app.use(router)
app.use(Toast)
app.use(i18n)
app.mount('#app')