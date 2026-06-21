import type { DrawingModuleKey } from '@/types/production'

function cleanRouteParam(value: string | null | undefined) {
  return String(value ?? '').trim()
}

export function isUnsafeDrawingRouteId(value: string | null | undefined, orderId?: string | null) {
  const id = cleanRouteParam(value)
  if (!id) return true
  if (id.startsWith('missing-') || id.startsWith('mock-')) return true
  return Boolean(orderId && id === orderId)
}

function encodeDrawingRouteParam(value: string) {
  return encodeURIComponent(value)
}

export function drawingCustomerRoute(customerId: string) {
  return `/tablet/drawings/customers/${encodeDrawingRouteParam(customerId)}`
}

export function drawingProductRoute(productId: string) {
  if (isUnsafeDrawingRouteId(productId)) return '/tablet'
  return `/tablet/drawings/products/${encodeDrawingRouteParam(productId)}`
}

export function drawingModuleRoute(productId: string, moduleKey: DrawingModuleKey) {
  if (isUnsafeDrawingRouteId(productId)) return '/tablet'
  return `/tablet/drawings/products/${encodeDrawingRouteParam(productId)}/modules/${encodeDrawingRouteParam(moduleKey)}`
}

export function drawingItemRoute(productId: string, moduleKey: DrawingModuleKey, itemId: string) {
  if (isUnsafeDrawingRouteId(productId) || isUnsafeDrawingRouteId(itemId)) return drawingModuleRoute(productId, moduleKey)
  return `${drawingModuleRoute(productId, moduleKey)}/items/${encodeDrawingRouteParam(itemId)}`
}
