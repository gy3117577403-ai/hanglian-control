import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { toast } from 'vue-sonner'
import {
  applyImport as applyImportApi,
  downloadImportTemplate,
  getImportHistory,
  getImportHistoryDetail,
  getImportTemplates,
  previewImport as previewImportApi,
  previewImportRollback,
} from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'
import type {
  ImportApplyPayload,
  ImportPreviewResult,
  ImportRecord,
  ImportRollbackPreview,
  ImportTemplateDefinition,
  ImportType,
} from '@/types/production'

export const importTypeOptions: Array<{ label: string; value: ImportType }> = [
  { label: '生产计划', value: 'production_plan' },
  { label: '客户产品', value: 'customer_product' },
  { label: '前段参数', value: 'front_parameter' },
  { label: '后段资料包', value: 'back_package' },
  { label: '治具库', value: 'fixture' },
  { label: '异常库', value: 'abnormal_case' },
  { label: '质量标准库', value: 'quality_standard' },
]

export const useImportStore = defineStore('imports', () => {
  const auth = useAuthStore()
  const importTypes = ref<ImportTemplateDefinition[]>([])
  const selectedImportType = ref<ImportType>('production_plan')
  const previewResult = ref<ImportPreviewResult | null>(null)
  const importHistory = ref<ImportRecord[]>([])
  const selectedHistory = ref<ImportRecord | null>(null)
  const rollbackPreview = ref<ImportRollbackPreview | null>(null)
  const importLoading = ref(false)
  const previewLoading = ref(false)
  const applyLoading = ref(false)
  const errorMessage = ref('')

  const selectedTemplate = computed(() => importTypes.value.find((item) => item.type === selectedImportType.value))
  const canApply = computed(() => Boolean(previewResult.value && previewResult.value.errorRows === 0))

  async function loadTemplates() {
    importLoading.value = true
    try {
      importTypes.value = await getImportTemplates()
      errorMessage.value = ''
    } catch {
      errorMessage.value = '导入模板信息加载失败，请检查后端 API。'
    } finally {
      importLoading.value = false
    }
  }

  async function downloadTemplate() {
    try {
      await downloadImportTemplate(selectedImportType.value)
      toast.success('模板下载已触发', { description: '模板为演示字段，不包含真实客户资料。' })
    } catch {
      toast.error('模板下载失败', { description: '请确认后端 API 在线。' })
    }
  }

  async function previewImport(file: File) {
    previewLoading.value = true
    const formData = new FormData()
    formData.set('file', file)
    try {
      previewResult.value = await previewImportApi(selectedImportType.value, formData)
      errorMessage.value = ''
      toast.success('导入预览已生成', {
        description: `有效 ${previewResult.value.validRows} 行，警告 ${previewResult.value.warningRows} 行，错误 ${previewResult.value.errorRows} 行。`,
      })
    } catch {
      previewResult.value = null
      errorMessage.value = '导入预览失败，请检查文件格式和字段。'
      toast.error('导入预览失败', { description: errorMessage.value })
    } finally {
      previewLoading.value = false
    }
  }

  async function applyImport(remark = 'V2.3 现场知识库演示版') {
    if (!previewResult.value) return null
    applyLoading.value = true
    const user = auth.currentUser
    const payload: ImportApplyPayload = {
      previewId: previewResult.value.previewId,
      operatorId: user?.userId ?? 'mock-maintainer',
      operatorName: user?.name ?? '资料维护演示',
      operatorRole: user?.roleLabel,
      operatorTeam: user?.team,
      remark,
    }
    try {
      const result = await applyImportApi(selectedImportType.value, payload)
      toast.success('导入已应用', { description: result.message })
      await loadHistory()
      return result
    } catch {
      errorMessage.value = '应用导入失败，请确认预览没有错误行。'
      toast.error('应用导入失败', { description: errorMessage.value })
      return null
    } finally {
      applyLoading.value = false
    }
  }

  async function loadHistory() {
    importLoading.value = true
    try {
      importHistory.value = await getImportHistory()
      errorMessage.value = ''
    } catch {
      errorMessage.value = '导入历史加载失败。'
    } finally {
      importLoading.value = false
    }
  }

  async function loadHistoryDetail(id: string) {
    selectedHistory.value = await getImportHistoryDetail(id)
    return selectedHistory.value
  }

  async function loadRollbackPreview(id: string) {
    rollbackPreview.value = await previewImportRollback(id)
    return rollbackPreview.value
  }

  function resetPreview() {
    previewResult.value = null
    errorMessage.value = ''
  }

  return {
    importTypes,
    selectedImportType,
    selectedTemplate,
    previewResult,
    importHistory,
    selectedHistory,
    rollbackPreview,
    importLoading,
    previewLoading,
    applyLoading,
    errorMessage,
    canApply,
    loadTemplates,
    downloadTemplate,
    previewImport,
    applyImport,
    loadHistory,
    loadHistoryDetail,
    loadRollbackPreview,
    resetPreview,
  }
})
