import type { App, DirectiveBinding } from 'vue'

type AutoAnimateElement = HTMLElement & {
  __hanglianAutoAnimateObserver?: MutationObserver
}

const defaultDuration = 150

function durationFromBinding(binding: DirectiveBinding) {
  const duration = Number((binding.value as { duration?: number } | undefined)?.duration)
  return Number.isFinite(duration) && duration >= 0 ? Math.min(duration, 300) : defaultDuration
}

function animateNewChild(node: Node, duration: number) {
  if (!(node instanceof HTMLElement) || duration === 0) return
  if (typeof node.animate !== 'function') return
  node.animate(
    [
      { opacity: 0, transform: 'translateY(4px) scale(0.985)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ],
    {
      duration,
      easing: 'cubic-bezier(.2, .8, .2, 1)',
    },
  )
}

export function installLightAutoAnimate(app: App) {
  app.directive('auto-animate', {
    mounted(el: AutoAnimateElement, binding) {
      if (typeof MutationObserver === 'undefined') return
      const observer = new MutationObserver((mutations) => {
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
        const duration = durationFromBinding(binding)
        for (const mutation of mutations) {
          mutation.addedNodes.forEach((node) => animateNewChild(node, duration))
        }
      })
      observer.observe(el, { childList: true })
      el.__hanglianAutoAnimateObserver = observer
    },
    unmounted(el: AutoAnimateElement) {
      el.__hanglianAutoAnimateObserver?.disconnect()
      delete el.__hanglianAutoAnimateObserver
    },
  })
}
