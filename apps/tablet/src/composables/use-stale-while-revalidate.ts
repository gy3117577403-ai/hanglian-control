type CacheRecord<T> = {
  data?: T
  fetchedAt: number
  promise?: Promise<T>
  error?: unknown
}

type LoadOptions<T> = {
  force?: boolean
  background?: boolean
  onUpdate?: (data: T) => void
  onError?: (error: unknown) => void
}

type CacheOptions = {
  ttlMs: number
  onDeduplicatedRequest?: () => void
  onBackgroundRefresh?: () => void
}

export function createStaleWhileRevalidateCache<T>(options: CacheOptions) {
  const records = new Map<string, CacheRecord<T>>()

  function isFresh(record: CacheRecord<T>) {
    return Date.now() - record.fetchedAt < options.ttlMs
  }

  function refresh(key: string, loader: () => Promise<T>, loadOptions: LoadOptions<T> = {}) {
    const current = records.get(key)
    if (current?.promise && !loadOptions.force) {
      options.onDeduplicatedRequest?.()
      return current.promise
    }

    if (loadOptions.background) options.onBackgroundRefresh?.()

    const promise = loader()
      .then((data) => {
        records.set(key, { data, fetchedAt: Date.now() })
        loadOptions.onUpdate?.(data)
        return data
      })
      .catch((error) => {
        if (current?.data !== undefined) {
          records.set(key, { data: current.data, fetchedAt: current.fetchedAt, error })
        }
        loadOptions.onError?.(error)
        throw error
      })
      .finally(() => {
        const latest = records.get(key)
        if (latest?.promise === promise) {
          records.set(key, {
            data: latest.data,
            fetchedAt: latest.fetchedAt,
            error: latest.error,
          })
        }
      })

    records.set(key, {
      data: current?.data,
      fetchedAt: current?.fetchedAt ?? 0,
      promise,
      error: current?.error,
    })
    return promise
  }

  async function load(key: string, loader: () => Promise<T>, loadOptions: LoadOptions<T> = {}) {
    const record = records.get(key)
    if (!loadOptions.force && record?.data !== undefined) {
      loadOptions.onUpdate?.(record.data)
      if (!isFresh(record)) {
        void refresh(key, loader, { ...loadOptions, background: true }).catch(() => undefined)
      }
      return record.data
    }

    return refresh(key, loader, loadOptions)
  }

  function set(key: string, data: T) {
    records.set(key, { data, fetchedAt: Date.now() })
  }

  function invalidate(key?: string) {
    if (key) {
      records.delete(key)
      return
    }
    records.clear()
  }

  function has(key: string) {
    return records.has(key)
  }

  return {
    load,
    set,
    invalidate,
    has,
  }
}
