import {
  defineAsyncComponent,
  defineComponent,
  h,
  markRaw,
  onMounted,
  ref,
  shallowRef,
  type Component,
} from 'vue'
import WarmAsyncComponentFallback from '@/components/common/WarmAsyncComponentFallback.vue'

type ComponentModule = { default: Component } | Component

export interface WarmAsyncComponentOptions {
  name?: string
  label?: string
  delay?: number
  timeout?: number
}

function resolveComponent(module: ComponentModule): Component {
  if (module && typeof module === 'object' && 'default' in module) return markRaw(module.default)
  return markRaw(module as Component)
}

export function createWarmAsyncComponent(
  loader: () => Promise<ComponentModule>,
  options: WarmAsyncComponentOptions = {},
) {
  let cachedComponent: Component | null = null
  let pendingLoad: Promise<Component> | null = null

  function loadComponent(force = false) {
    if (cachedComponent && !force) return Promise.resolve(cachedComponent)
    if (pendingLoad && !force) return pendingLoad

    pendingLoad = loader()
      .then(resolveComponent)
      .then((component) => {
        cachedComponent = component
        return component
      })
      .finally(() => {
        pendingLoad = null
      })

    return pendingLoad
  }

  const nativeAsyncBoundary = markRaw(defineAsyncComponent({
    loader: () => loadComponent(),
    loadingComponent: WarmAsyncComponentFallback,
    errorComponent: WarmAsyncComponentFallback,
    delay: options.delay ?? 80,
    timeout: options.timeout ?? 10000,
    suspensible: false,
  }))
  void nativeAsyncBoundary

  return markRaw(defineComponent({
    name: options.name ?? 'WarmAsyncComponent',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      const component = shallowRef<Component | null>(cachedComponent)
      const loading = ref(!cachedComponent)
      const error = shallowRef<unknown>(null)

      async function load(force = false) {
        loading.value = true
        error.value = null
        try {
          component.value = await loadComponent(force)
        } catch (cause) {
          error.value = cause
        } finally {
          loading.value = false
        }
      }

      function retry() {
        void load(true)
      }

      onMounted(() => {
        if (!component.value) void load()
      })

      return () => {
        if (component.value) return h(component.value, attrs, slots)
        return h(WarmAsyncComponentFallback, {
          state: error.value ? 'error' : 'loading',
          label: options.label,
          error: error.value,
          onRetry: retry,
        })
      }
    },
  }))
}
