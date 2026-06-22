import type { Router } from 'vue-router'
import { App as CapacitorApp } from '@capacitor/app'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { installAndroidBackHandler } from './android-back-handler'
import { installNativeGestureLock } from './native-gesture-lock'
import { initializeNativeNetwork, refreshNativeNetworkStatus } from './native-network'
import { isNativeApp } from './native-platform'
import { installNativePerfDiagnostics } from '@/composables/use-native-mode-cache'

type Removable = {
  remove: () => Promise<void> | void
}

let initialized = false
let cleanupNativeShell: (() => void) | null = null

function closeActiveCameraStream() {
  for (const video of document.querySelectorAll<HTMLVideoElement>('video')) {
    const stream = video.srcObject
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop())
      video.srcObject = null
    }
  }
  window.dispatchEvent(new CustomEvent('hanglian:native-close-camera-stream'))
}

async function hideSplashAfterFirstPaint() {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
  try {
    await SplashScreen.hide()
  } catch {
    // Splash failures must not block app startup.
  }
}

export async function initializeNativeShell(router: Router) {
  if (!isNativeApp()) return null
  if (initialized) return cleanupNativeShell
  initialized = true

  document.documentElement.dataset.nativeApp = 'true'

  try {
    await StatusBar.setOverlaysWebView({ overlay: false })
    await StatusBar.setBackgroundColor({ color: '#fff7ed' })
    await StatusBar.setStyle({ style: Style.Light })
  } catch {
    // Status bar APIs vary by Android WebView and should never stop startup.
  }

  try {
    await ScreenOrientation.lock({ orientation: 'landscape' })
  } catch {
    // The Android manifest remains the source of truth for landscape policy.
  }

  const cleanupNetwork = await initializeNativeNetwork()
  const cleanupBack = await installAndroidBackHandler(router)
  const cleanupGestureLock = installNativeGestureLock()
  const cleanupPerfDiagnostics = installNativePerfDiagnostics()
  const handles: Removable[] = []

  try {
    handles.push(await CapacitorApp.addListener('resume', () => {
      void refreshNativeNetworkStatus()
    }))
    handles.push(await CapacitorApp.addListener('pause', () => {
      closeActiveCameraStream()
    }))
  } catch {
    // App lifecycle listeners are best-effort in development WebViews.
  }

  void hideSplashAfterFirstPaint()

  cleanupNativeShell = () => {
    cleanupNetwork?.()
    cleanupBack?.()
    cleanupGestureLock?.()
    cleanupPerfDiagnostics?.()
    for (const handle of handles) void handle.remove()
    cleanupNativeShell = null
    initialized = false
  }
  return cleanupNativeShell
}
