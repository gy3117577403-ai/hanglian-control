import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'primeicons/primeicons.css'
import './style.css'
import './styles/warm-control-theme.css'
import './styles/tablet-performance.css'
import App from './App.vue'
import { router } from './app/routes'
import { initializeNativeShell } from './native/native-shell'
import { installLightAutoAnimate } from './plugins/light-auto-animate'
import { installPrimeVue } from './plugins/primevue'

const app = createApp(App)
const pinia = createPinia()

installPrimeVue(app)
installLightAutoAnimate(app)

app.use(pinia).use(router).mount('#app')
void initializeNativeShell(router)
