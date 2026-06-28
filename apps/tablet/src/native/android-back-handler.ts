import type { Router } from 'vue-router'
import { App as CapacitorApp } from '@capacitor/app'
import { isAndroidApp } from './native-platform'
import { useDocumentHubStore } from '@/stores/document-hub-store'

type Removable = {
  remove: () => Promise<void> | void
}

let cleanupBackHandler: (() => void) | null = null
let lastRootBackAt = 0

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || target.isContentEditable
}

function dispatchNativeMessage(message: string) {
  window.dispatchEvent(new CustomEvent('hanglian:native-message', { detail: { message } }))
}

function closeTopPrimeDialog() {
  const masks = Array.from(document.querySelectorAll<HTMLElement>('.p-dialog-mask'))
    .filter((item) => item.offsetParent !== null || getComputedStyle(item).display !== 'none')
  const dialogs = Array.from(document.querySelectorAll<HTMLElement>('.p-dialog'))
    .filter((item) => item.offsetParent !== null || getComputedStyle(item).display !== 'none')
  const topLayer = masks.at(-1) ?? dialogs.at(-1)
  if (!topLayer) return false

  const closeButton = topLayer.querySelector<HTMLButtonElement>('.p-dialog-header-close, button[aria-label="Close"], button[aria-label="关闭"]')
  if (closeButton && !closeButton.disabled) {
    closeButton.click()
    return true
  }

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }))
  return true
}

function shouldUseStoreBack(store: ReturnType<typeof useDocumentHubStore>) {
  return store.documentViewerOpen
    || store.drawingViewLevel !== 'customers'
    || Boolean(store.selectedProduct)
    || Boolean(store.selectedModule)
    || Boolean(store.productDrawingDetail)
    || Boolean(store.unarchivedProductContext)
}

export async function installAndroidBackHandler(router: Router) {
  if (!isAndroidApp()) return null
  if (cleanupBackHandler) return cleanupBackHandler

  const handle: Removable = await CapacitorApp.addListener('backButton', async ({ canGoBack }) => {
    if (isEditableTarget(document.activeElement)) {
      ;(document.activeElement as HTMLElement).blur()
      return
    }

    if (closeTopPrimeDialog()) return

    const store = useDocumentHubStore()
    if (store.documentViewerOpen) {
      await store.closeDocumentViewer()
      return
    }

    if (shouldUseStoreBack(store)) {
      await store.goBack()
      return
    }

    if (router.currentRoute.value.path !== '/tablet' && canGoBack) {
      router.back()
      return
    }

    const now = Date.now()
    if (now - lastRootBackAt < 2000) {
      await CapacitorApp.exitApp()
      return
    }
    lastRootBackAt = now
    dispatchNativeMessage('再次返回退出应用')
  })

  cleanupBackHandler = () => {
    void handle.remove()
    cleanupBackHandler = null
  }
  return cleanupBackHandler
}
