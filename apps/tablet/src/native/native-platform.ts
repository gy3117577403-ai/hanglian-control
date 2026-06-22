import { Capacitor } from '@capacitor/core'
import { normalizeApiBaseUrl } from '@/config/runtime-config'

export const NATIVE_API_MISSING_MESSAGE = 'APP 尚未配置服务器地址。'

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

export function isAndroidApp() {
  return isNativeApp() && Capacitor.getPlatform() === 'android'
}

export function getNativeApiBaseUrl() {
  if (!isNativeApp()) return ''
  return normalizeApiBaseUrl(import.meta.env.VITE_NATIVE_API_BASE_URL)
}

export function getNativeRuntimeInfo() {
  const apiBaseUrl = getNativeApiBaseUrl()
  return {
    platform: Capacitor.getPlatform(),
    isNative: isNativeApp(),
    isAndroid: isAndroidApp(),
    apiBaseUrl,
    apiConfigured: Boolean(apiBaseUrl),
    apiEnv: String(import.meta.env.VITE_NATIVE_API_ENV ?? '').trim(),
  }
}
