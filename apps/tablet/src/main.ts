import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'primeicons/primeicons.css'
import './style.css'
import './styles/warm-control-theme.css'
import App from './App.vue'
import { router } from './app/routes'
import { installLightAutoAnimate } from './plugins/light-auto-animate'
import { installPrimeVue } from './plugins/primevue'

const app = createApp(App)

installPrimeVue(app)
installLightAutoAnimate(app)

app.use(createPinia()).use(router).mount('#app')
