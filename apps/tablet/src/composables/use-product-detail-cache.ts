import type { ProductDrawingDetail } from '@/types/production'

export const PRODUCT_DETAIL_CACHE_TTL_MS = 30_000

interface ProductDetailCacheEntry {
  detail?: ProductDrawingDetail
  fetchedAt: number
  promise?: Promise<ProductDrawingDetail>
}

interface LoadProductDetailOptions {
  force?: boolean
}

export function createProductDetailCache(
  fetchProductDetail: (productId: string) => Promise<ProductDrawingDetail>,
  ttlMs = PRODUCT_DETAIL_CACHE_TTL_MS,
) {
  const entries = new Map<string, ProductDetailCacheEntry>()

  function setProductDetailCache(detail: ProductDrawingDetail) {
    const productId = detail.product.productId
    entries.set(productId, {
      detail,
      fetchedAt: Date.now(),
    })
  }

  function invalidateProductDetailCache(productId?: string | null) {
    if (productId) {
      entries.delete(productId)
      return
    }
    entries.clear()
  }

  async function loadProductDetail(productId: string, options: LoadProductDetailOptions = {}) {
    const entry = entries.get(productId)
    const now = Date.now()
    if (!options.force && entry?.detail && now - entry.fetchedAt < ttlMs) return entry.detail
    if (!options.force && entry?.promise) return entry.promise

    const promise = fetchProductDetail(productId)
      .then((detail) => {
        setProductDetailCache(detail)
        return detail
      })
      .catch((error) => {
        if (!entry?.detail) entries.delete(productId)
        throw error
      })
      .finally(() => {
        const current = entries.get(productId)
        if (current?.promise !== promise) return
        if (current.detail) {
          entries.set(productId, {
            detail: current.detail,
            fetchedAt: current.fetchedAt,
          })
        } else {
          entries.delete(productId)
        }
      })

    entries.set(productId, {
      detail: options.force ? undefined : entry?.detail,
      fetchedAt: entry?.fetchedAt ?? 0,
      promise,
    })
    return promise
  }

  return {
    loadProductDetail,
    setProductDetailCache,
    invalidateProductDetailCache,
  }
}
