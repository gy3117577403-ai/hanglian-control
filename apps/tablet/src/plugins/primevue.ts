import type { App } from 'vue'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import Aura from '@primeuix/themes/aura'
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import Card from 'primevue/card'
import ConfirmDialog from 'primevue/confirmdialog'
import Dialog from 'primevue/dialog'
import Divider from 'primevue/divider'
import FileUpload from 'primevue/fileupload'
import InputText from 'primevue/inputtext'
import Menu from 'primevue/menu'
import Message from 'primevue/message'
import Panel from 'primevue/panel'
import ProgressBar from 'primevue/progressbar'
import Select from 'primevue/select'
import Skeleton from 'primevue/skeleton'
import SplitButton from 'primevue/splitbutton'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import Timeline from 'primevue/timeline'
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
  app.component('PrimeCard', Card)
  app.component('PrimeConfirmDialog', ConfirmDialog)
  app.component('PrimeDialog', Dialog)
  app.component('PrimeDivider', Divider)
  app.component('PrimeFileUpload', FileUpload)
  app.component('PrimeInputText', InputText)
  app.component('PrimeMenu', Menu)
  app.component('PrimeMessage', Message)
  app.component('PrimePanel', Panel)
  app.component('PrimeProgressBar', ProgressBar)
  app.component('PrimeSelect', Select)
  app.component('PrimeSkeleton', Skeleton)
  app.component('PrimeSplitButton', SplitButton)
  app.component('PrimeTab', Tab)
  app.component('PrimeTabList', TabList)
  app.component('PrimeTabPanel', TabPanel)
  app.component('PrimeTabPanels', TabPanels)
  app.component('PrimeTabs', Tabs)
  app.component('PrimeTag', Tag)
  app.component('PrimeTextarea', Textarea)
  app.component('PrimeTimeline', Timeline)
  app.component('PrimeToast', Toast)
}
