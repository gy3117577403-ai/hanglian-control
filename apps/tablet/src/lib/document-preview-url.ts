import { getApiBaseUrl } from '@/config/api-base'

function cleanApiBaseUrl() {
  try {
    return new URL(getApiBaseUrl())
  } catch {
    return null
  }
}

function normalizeFilePath(raw?: string | null) {
  const value = String(raw ?? '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) {
    try {
      return new URL(value).toString()
    } catch {
      return ''
    }
  }
  return value.startsWith('/') ? value : `/${value}`
}

function resolveDocumentFileUrl(raw?: string | null) {
  const path = normalizeFilePath(raw)
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path

  const apiBase = cleanApiBaseUrl()
  if (!apiBase) return ''
  const apiPath = apiBase.pathname.replace(/\/+$/, '')
  const normalizedApiPath = apiPath === '/' ? '' : apiPath
  const pathWithApi = normalizedApiPath && !path.startsWith(`${normalizedApiPath}/`)
    ? `${normalizedApiPath}${path}`
    : path

  return `${apiBase.origin}${pathWithApi}`.replace(/\/api\/api\/files/g, '/api/files')
}

export function resolveDocumentPreviewUrl(previewUrl?: string | null) {
  return resolveDocumentFileUrl(previewUrl)
}

export function resolveDocumentDownloadUrl(downloadUrl?: string | null) {
  return resolveDocumentFileUrl(downloadUrl)
}
