import type { App } from 'vue'
import { defineAsyncComponent } from 'vue'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import Aura from '@primeuix/themes/aura'
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Toast from 'primevue/toast'

export function installPrimeVue(app: App) {
  app.use(PrimeVue, {
    ripple: true,
    inputVariant: 'filled',
    theme: {
      preset: Aura,
      options: {
        darkModeSelector: '.never-enable-prime-night-mode',
        cssLayer: {
          name: 'primevue',
          order: 'theme, base, primevue, components, utilities',
        },
      },
    },
  })

  app.use(ToastService)
  app.use(ConfirmationService)

  app.component('PrimeBadge', Badge)
  app.component('PrimeButton', Button)
  app.component('PrimeConfirmDialog', ConfirmDialog)
  app.component('PrimeDialog', Dialog)
  app.component('PrimeInputText', InputText)
  app.component('PrimeToast', Toast)
  app.component('PrimeCard', defineAsyncComponent(() => import('primevue/card')))
  app.component('PrimeColumn', defineAsyncComponent(() => import('primevue/column')))
  app.component('PrimeDataTable', defineAsyncComponent(() => import('primevue/datatable')))
  app.component('PrimeDivider', defineAsyncComponent(() => import('primevue/divider')))
  app.component('PrimeFileUpload', defineAsyncComponent(() => import('primevue/fileupload')))
  app.component('PrimeMenu', defineAsyncComponent(() => import('primevue/menu')))
  app.component('PrimeMessage', defineAsyncComponent(() => import('primevue/message')))
  app.component('PrimePanel', defineAsyncComponent(() => import('primevue/panel')))
  app.component('PrimeProgressBar', defineAsyncComponent(() => import('primevue/progressbar')))
  app.component('PrimeSelect', defineAsyncComponent(() => import('primevue/select')))
  app.component('PrimeSkeleton', defineAsyncComponent(() => import('primevue/skeleton')))
  app.component('PrimeSplitButton', defineAsyncComponent(() => import('primevue/splitbutton')))
  app.component('PrimeTab', defineAsyncComponent(() => import('primevue/tab')))
  app.component('PrimeTabList', defineAsyncComponent(() => import('primevue/tablist')))
  app.component('PrimeTabPanel', defineAsyncComponent(() => import('primevue/tabpanel')))
  app.component('PrimeTabPanels', defineAsyncComponent(() => import('primevue/tabpanels')))
  app.component('PrimeTabs', defineAsyncComponent(() => import('primevue/tabs')))
  app.component('PrimeTag', defineAsyncComponent(() => import('primevue/tag')))
  app.component('PrimeTextarea', defineAsyncComponent(() => import('primevue/textarea')))
  app.component('PrimeTimeline', defineAsyncComponent(() => import('primevue/timeline')))
}
