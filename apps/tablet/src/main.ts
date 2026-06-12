import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { autoAnimatePlugin } from '@formkit/auto-animate/vue'
import 'primeicons/primeicons.css'
import './style.css'
import './styles/warm-control-theme.css'
import App from './App.vue'
import { router } from './app/routes'
import { installPrimeVue } from './plugins/primevue'

const app = createApp(App)

installPrimeVue(app)

app.use(createPinia()).use(router).use(autoAnimatePlugin).mount('#app')
