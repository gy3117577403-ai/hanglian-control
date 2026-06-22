import { isNativeApp } from './native-platform'
import { recordNativeBlockedMultitouch } from '@/composables/use-native-mode-cache'

let cleanupGestureLock: (() => void) | null = null

function isViewerGestureSurface(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('[data-viewer-gesture-surface="true"]'))
}

function blockNativePagePinch(event: TouchEvent) {
  if (!(event.touches.length > 1)) return
  if (isViewerGestureSurface(event.target)) return
  event.preventDefault()
  recordNativeBlockedMultitouch()
}

export function installNativeGestureLock() {
  if (!isNativeApp()) return null
  if (cleanupGestureLock) return cleanupGestureLock

  const options: AddEventListenerOptions = { capture: true, passive: false }
  document.addEventListener('touchstart', blockNativePagePinch, options)
  document.addEventListener('touchmove', blockNativePagePinch, options)

  cleanupGestureLock = () => {
    document.removeEventListener('touchstart', blockNativePagePinch, options)
    document.removeEventListener('touchmove', blockNativePagePinch, options)
    cleanupGestureLock = null
  }

  return cleanupGestureLock
}
