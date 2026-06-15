import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'
import {
  bulkDeleteUnifiedDocuments,
  bulkPurgeUnifiedDocuments,
  bulkRestoreUnifiedDocuments,
  deleteUnifiedDocument,
  getDeleteLockStatus,
  getUnifiedDocument,
  getUnifiedDocumentVersions,
  getUnifiedTrash,
  purgeUnifiedDocument,
  restoreUnifiedDocument,
  searchUnifiedDocuments,
  setUnifiedDocumentEffective,
  setupDeleteLock,
  updateUnifiedDocument,
  uploadUnifiedDocument,
} from '@/services/api'
import type {
  BulkActionResult,
  DeleteLockSetupPayload,
  DeleteLockStatus,
  DocumentStatus,
  RequiredProcess,
  UnifiedDocumentItem,
  UnifiedDocumentType,
  UnifiedUpdatePayload,
  UnifiedUploadPayload,
} from '@/types/production'

const queryLogKey = 'hanglian.unified.recentQueries'
const uploadLogKey = 'hanglian.unified.uploadLogs'

interface UnifiedFilters {
  type: UnifiedDocumentType
  customer: string
  productCode: string
  status: string
}

interface UploadLog {
  id: string
  title: string
  time: string
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback
  try {
    return JSON.parse(localStorage.getItem(key) || '') as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

function errorMessage(error: unknown) {
  const anyError = error as { data?: { message?: string | string[] }; message?: string }
  const message = anyError.data?.message
  if (Array.isArray(message)) return message.join('，')
  return message || anyError.message || '操作失败，请稍后再试。'
}

function appendIfPresent(formData: FormData, key: string, value: string | undefined) {
  if (value !== undefined && value !== '') formData.append(key, value)
}

export const useUnifiedDocumentStore = defineStore('unified-document-store', () => {
  const keyword = ref('')
  const filters = reactive<UnifiedFilters>({
    type: 'all',
    customer: '',
    productCode: '',
    status: '',
  })
  const results = ref<UnifiedDocumentItem[]>([])
  const selectedItem = ref<UnifiedDocumentItem | null>(null)
  const selectedIds = ref<string[]>([])
  const trashItems = ref<UnifiedDocumentItem[]>([])
  const loading = ref(false)
  const uploadDialogOpen = ref(false)
  const editDialogOpen = ref(false)
  const trashDialogOpen = ref(false)
  const deletePasswordDialogOpen = ref(false)
  const deleteLockSetupOpen = ref(false)
  const deleteLockStatus = ref<DeleteLockStatus | null>(null)
  const versions = ref<unknown>(null)
  const recentQueries = ref<string[]>(readJson<string[]>(queryLogKey, []))
  const uploadLogs = ref<UploadLog[]>(readJson<UploadLog[]>(uploadLogKey, []))
  const lastBulkResult = ref<BulkActionResult | null>(null)

  const selectedCount = computed(() => selectedIds.value.length)
  const hasSelection = computed(() => selectedIds.value.length > 0)

  async function initialize() {
    await Promise.allSettled([search(), loadTrash(), refreshDeleteLockStatus()])
  }

  async function search(nextKeyword?: string) {
    if (nextKeyword !== undefined) keyword.value = nextKeyword
    loading.value = true
    try {
      const response = await searchUnifiedDocuments({
        q: keyword.value,
        type: filters.type,
        customer: filters.customer,
        productCode: filters.productCode,
        status: filters.status,
      })
      results.value = response.items
      if (!selectedItem.value && response.items[0]) selectedItem.value = response.items[0]
      if (keyword.value.trim()) addQueryLog(keyword.value.trim())
    } catch (error) {
      toast.error('资料查询失败', { description: errorMessage(error) })
    } finally {
      loading.value = false
    }
  }

  async function selectItem(id: string) {
    const local = results.value.find((item) => item.id === id) ?? trashItems.value.find((item) => item.id === id)
    selectedItem.value = local ?? null
    try {
      selectedItem.value = await getUnifiedDocument(id)
      await loadVersions(id)
    } catch (error) {
      toast.error('资料详情加载失败', { description: errorMessage(error) })
    }
  }

  async function loadVersions(id = selectedItem.value?.id) {
    if (!id) return
    versions.value = await getUnifiedDocumentVersions(id).catch(() => null)
  }

  async function upload(payload: UnifiedUploadPayload) {
    const formData = new FormData()
    formData.append('file', payload.file)
    formData.append('productCode', payload.productCode)
    formData.append('productName', payload.productName)
    formData.append('documentType', payload.documentType)
    formData.append('title', payload.title)
    formData.append('version', payload.version)
    appendIfPresent(formData, 'customerName', payload.customerName)
    appendIfPresent(formData, 'productVersion', payload.productVersion)
    appendIfPresent(formData, 'status', payload.status)
    appendIfPresent(formData, 'requiredForProcess', payload.requiredForProcess)
    appendIfPresent(formData, 'keywords', payload.keywords)
    appendIfPresent(formData, 'remark', payload.remark)

    try {
      const document = await uploadUnifiedDocument(formData)
      selectedItem.value = document
      addUploadLog(document)
      await search()
      toast.success('资料上传成功', { description: document.title })
      uploadDialogOpen.value = false
    } catch (error) {
      toast.error('资料上传失败', { description: errorMessage(error) })
      throw error
    }
  }

  async function updateCurrent(payload: UnifiedUpdatePayload) {
    if (!selectedItem.value) return
    try {
      const document = await updateUnifiedDocument(selectedItem.value.id, payload)
      selectedItem.value = document
      await search()
      await loadVersions(document.id)
      toast.success('资料信息已更新')
      editDialogOpen.value = false
    } catch (error) {
      toast.error('资料编辑失败', { description: errorMessage(error) })
      throw error
    }
  }

  async function setEffectiveCurrent() {
    if (!selectedItem.value) return
    try {
      await setUnifiedDocumentEffective(selectedItem.value.id)
      await search()
      await loadVersions(selectedItem.value.id)
      toast.success('已设为当前有效版本')
    } catch (error) {
      toast.error('设置有效版本失败', { description: errorMessage(error) })
    }
  }

  async function loadTrash() {
    trashItems.value = await getUnifiedTrash().catch(() => [])
  }

  async function refreshDeleteLockStatus() {
    deleteLockStatus.value = await getDeleteLockStatus().catch(() => null)
  }

  async function setupDeletePassword(payload: DeleteLockSetupPayload) {
    try {
      deleteLockStatus.value = await setupDeleteLock(payload)
      toast.success('删除密码已设置')
      deleteLockSetupOpen.value = false
    } catch (error) {
      toast.error('删除密码设置失败', { description: errorMessage(error) })
      throw error
    }
  }

  async function deleteItem(id: string, password: string, reason?: string) {
    try {
      await deleteUnifiedDocument(id, { password, reason })
      await Promise.all([search(), loadTrash()])
      selectedIds.value = selectedIds.value.filter((item) => item !== id)
      toast.success('已移入回收站')
    } catch (error) {
      toast.error('删除失败', { description: errorMessage(error) })
      throw error
    } finally {
      await refreshDeleteLockStatus()
    }
  }

  async function restoreItem(id: string, reason?: string) {
    try {
      const restored = await restoreUnifiedDocument(id, { reason })
      selectedItem.value = restored
      await Promise.all([search(), loadTrash()])
      toast.success('资料已恢复')
    } catch (error) {
      toast.error('恢复失败', { description: errorMessage(error) })
    }
  }

  async function purgeItem(id: string, password: string, confirmText: string, reason?: string) {
    try {
      await purgeUnifiedDocument(id, { password, confirmText, reason })
      if (selectedItem.value?.id === id) selectedItem.value = null
      await Promise.all([search(), loadTrash()])
      selectedIds.value = selectedIds.value.filter((item) => item !== id)
      toast.success('资料已彻底删除')
    } catch (error) {
      toast.error('彻底删除失败', { description: errorMessage(error) })
      throw error
    } finally {
      await refreshDeleteLockStatus()
    }
  }

  async function bulkDelete(password: string, reason?: string) {
    try {
      lastBulkResult.value = await bulkDeleteUnifiedDocuments({ ids: selectedIds.value, password, reason })
      await Promise.all([search(), loadTrash()])
      toast.success(`批量删除完成：成功 ${lastBulkResult.value.successCount} 条`)
      selectedIds.value = []
    } catch (error) {
      toast.error('批量删除失败', { description: errorMessage(error) })
      throw error
    } finally {
      await refreshDeleteLockStatus()
    }
  }

  async function bulkRestore(reason?: string) {
    if (!selectedIds.value.length) return
    lastBulkResult.value = await bulkRestoreUnifiedDocuments({ ids: selectedIds.value, reason })
    await Promise.all([search(), loadTrash()])
    toast.success(`批量恢复完成：成功 ${lastBulkResult.value.successCount} 条`)
    selectedIds.value = []
  }

  async function bulkPurge(password: string, confirmText: string, reason?: string) {
    try {
      lastBulkResult.value = await bulkPurgeUnifiedDocuments({ ids: selectedIds.value, password, confirmText, reason })
      await Promise.all([search(), loadTrash()])
      toast.success(`批量彻底删除完成：成功 ${lastBulkResult.value.successCount} 条`)
      selectedIds.value = []
    } catch (error) {
      toast.error('批量彻底删除失败', { description: errorMessage(error) })
      throw error
    } finally {
      await refreshDeleteLockStatus()
    }
  }

  function toggleSelected(id: string) {
    selectedIds.value = selectedIds.value.includes(id)
      ? selectedIds.value.filter((item) => item !== id)
      : [...selectedIds.value, id]
  }

  function clearSelection() {
    selectedIds.value = []
  }

  function setType(type: UnifiedDocumentType) {
    filters.type = type
    void search()
  }

  function setStatus(status: DocumentStatus | string) {
    filters.status = status
    void search()
  }

  function setProcess(_process: RequiredProcess) {
    void search()
  }

  function addQueryLog(value: string) {
    recentQueries.value = [value, ...recentQueries.value.filter((item) => item !== value)].slice(0, 8)
    writeJson(queryLogKey, recentQueries.value)
  }

  function addUploadLog(item: UnifiedDocumentItem) {
    uploadLogs.value = [{ id: item.id, title: item.title, time: new Date().toLocaleString('zh-CN') }, ...uploadLogs.value].slice(0, 8)
    writeJson(uploadLogKey, uploadLogs.value)
  }

  return {
    keyword,
    filters,
    results,
    selectedItem,
    selectedIds,
    trashItems,
    loading,
    uploadDialogOpen,
    editDialogOpen,
    trashDialogOpen,
    deletePasswordDialogOpen,
    deleteLockSetupOpen,
    deleteLockStatus,
    versions,
    recentQueries,
    uploadLogs,
    lastBulkResult,
    selectedCount,
    hasSelection,
    initialize,
    search,
    selectItem,
    loadVersions,
    upload,
    updateCurrent,
    setEffectiveCurrent,
    loadTrash,
    refreshDeleteLockStatus,
    setupDeletePassword,
    deleteItem,
    restoreItem,
    purgeItem,
    bulkDelete,
    bulkRestore,
    bulkPurge,
    toggleSelected,
    clearSelection,
    setType,
    setStatus,
    setProcess,
    addQueryLog,
  }
})
