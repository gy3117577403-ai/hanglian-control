<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { DatabaseZap, FileSpreadsheet, RotateCcw, UploadCloud } from 'lucide-vue-next'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import WarmPermissionDenied from '@/components/auth/WarmPermissionDenied.vue'
import { PERMISSIONS } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth-store'
import { importTypeOptions, useImportStore } from '@/stores/import-store'
import type { ImportPreviewRow } from '@/types/production'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  imported: []
}>()

const importStore = useImportStore()
const auth = useAuthStore()
const confirm = useConfirm()
const toast = useToast()
const selectedFile = ref<File | null>(null)
const activeTab = ref('preview')
const remark = ref('V2.2 角色权限演示版')
const rollbackText = ref('')

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const previewRows = computed(() => importStore.previewResult?.rows.slice(0, 30) ?? [])
const previewColumns = computed(() => (importStore.previewResult?.columns ?? []).slice(0, 6))
const canPreviewImport = computed(() => auth.hasPermission(PERMISSIONS.IMPORT_PREVIEW))
const canApplyImport = computed(() => auth.hasPermission(PERMISSIONS.IMPORT_APPLY))

function statusSeverity(status: ImportPreviewRow['status']) {
  if (status === 'valid') return 'success'
  if (status === 'warning') return 'warn'
  return 'danger'
}

function statusLabel(status: ImportPreviewRow['status']) {
  if (status === 'valid') return '有效'
  if (status === 'warning') return '警告'
  return '错误'
}

function onFileSelect(event: { files?: File[] }) {
  selectedFile.value = event.files?.[0] ?? null
  importStore.resetPreview()
}

function clearFile() {
  selectedFile.value = null
  importStore.resetPreview()
}

async function previewSelectedFile() {
  if (!canPreviewImport.value) return deny()
  if (!selectedFile.value) {
    toast.add({ severity: 'warn', summary: '请选择导入文件', detail: '支持 Excel / CSV。', life: 2400 })
    return
  }
  await importStore.previewImport(selectedFile.value)
}

async function applyCurrentPreview() {
  if (!canApplyImport.value) return deny()
  const preview = importStore.previewResult
  if (!preview || preview.errorRows > 0) return
  const run = async () => {
    const result = await importStore.applyImport(remark.value)
    if (result?.success) {
      emit('imported')
      activeTab.value = 'history'
    }
  }
  if (preview.warningRows > 0) {
    confirm.require({
      header: '确认应用带警告的导入',
      message: `当前预览有 ${preview.warningRows} 行警告。应用后会写入本地 Mock / metadata，不连接数据库。`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: '继续应用',
      rejectLabel: '返回检查',
      acceptClass: 'p-button-warning',
      accept: run,
    })
    return
  }
  await run()
}

function deny() {
  toast.add({ severity: 'error', summary: '当前角色无权执行该操作。', detail: '请在右上角切换到具备权限的 Mock 角色。', life: 2600 })
}

async function showRollbackPreview(id: string) {
  const result = await importStore.loadRollbackPreview(id)
  rollbackText.value = result
    ? `${result.message} 可能影响：计划 ${result.affectedPlans}、产品 ${result.affectedProducts}、客户 ${result.affectedCustomers}、前段参数 ${result.affectedParameters}、后段资料包 ${result.affectedBackPackages}。`
    : ''
}

watch(dialogVisible, async (visible) => {
  if (!visible) return
  await Promise.all([
    importStore.loadTemplates(),
    importStore.loadHistory(),
  ])
})

watch(() => importStore.selectedImportType, () => {
  clearFile()
})
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="数据导入中心" class="import-center-dialog">
    <div class="grid max-h-[78vh] gap-4 overflow-auto pr-1">
      <section class="system-hero-panel">
        <DatabaseZap :size="38" />
        <div>
          <p class="section-kicker">DATA IMPORT CENTER / MOCK METADATA</p>
          <h3>V2.0 生产计划与基础资料导入管理</h3>
          <p>导入数据只写入本地 Mock / metadata，不连接 Sealos，不上传真实客户资料。</p>
        </div>
        <PrimeTag severity="warn" value="演示导入" />
      </section>

      <PrimeMessage severity="warn" :closable="false">
        请选择 `demo-import-files` 中的演示文件测试导入。不要导入真实客户计划、图纸编号或量产资料。
      </PrimeMessage>
      <WarmPermissionDenied
        v-if="!canPreviewImport"
        title="当前角色不能预览导入"
        description="请切换到资料维护、管理员或具备导入权限的演示角色。"
      />

      <PrimeTabs v-model:value="activeTab">
        <PrimeTabList>
          <PrimeTab value="preview">导入预览</PrimeTab>
          <PrimeTab value="history">导入历史</PrimeTab>
          <PrimeTab value="guide">模板字段</PrimeTab>
        </PrimeTabList>
        <PrimeTabPanels>
          <PrimeTabPanel value="preview">
            <div class="import-control-grid">
              <div>
                <label>导入类型</label>
                <PrimeSelect
                  v-model="importStore.selectedImportType"
                  class="mt-2 w-full"
                  :options="importTypeOptions"
                  option-label="label"
                  option-value="value"
                />
              </div>
              <div>
                <label>模板下载</label>
                <PrimeButton class="mt-2 w-full" severity="secondary" label="下载当前模板" @click="importStore.downloadTemplate">
                  <template #icon><FileSpreadsheet :size="17" /></template>
                </PrimeButton>
              </div>
              <div>
                <label>导入备注</label>
                <PrimeInputText v-model="remark" class="mt-2 w-full" />
              </div>
            </div>

            <div class="upload-drop-frame mt-4 p-3">
              <PrimeFileUpload
                mode="advanced"
                name="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                :multiple="false"
                :custom-upload="true"
                :show-upload-button="false"
                :show-cancel-button="false"
                choose-label="选择 Excel / CSV"
                invalid-file-type-message="{0} 文件格式不支持。"
                @select="onFileSelect"
                @clear="clearFile"
              >
                <template #empty>
                  <div class="grid min-h-20 place-items-center text-center">
                    <div>
                      <p class="text-lg font-black text-[#3b2514]">拖入或选择导入文件</p>
                      <p class="mt-1 text-sm font-bold text-[#76512a]">支持 Excel / CSV，先预览校验，再应用导入。</p>
                    </div>
                  </div>
                </template>
              </PrimeFileUpload>
            </div>

            <div v-if="selectedFile" class="import-file-strip">
              <span>{{ selectedFile.name }}</span>
              <strong>{{ Math.max(1, Math.round(selectedFile.size / 1024)) }} KB</strong>
            </div>

            <div class="mt-4 flex flex-wrap gap-3">
              <PrimeButton label="生成预览" :disabled="!canPreviewImport" :loading="importStore.previewLoading" @click="previewSelectedFile">
                <template #icon><UploadCloud :size="17" /></template>
              </PrimeButton>
              <PrimeButton
                label="应用导入"
                severity="warn"
                :disabled="!importStore.canApply || !canApplyImport"
                :loading="importStore.applyLoading"
                @click="applyCurrentPreview"
              />
            </div>

            <section v-if="importStore.previewResult" class="import-summary-grid">
              <article><span>总行数</span><strong>{{ importStore.previewResult.totalRows }}</strong></article>
              <article><span>有效行</span><strong>{{ importStore.previewResult.validRows }}</strong></article>
              <article><span>警告行</span><strong>{{ importStore.previewResult.warningRows }}</strong></article>
              <article><span>错误行</span><strong>{{ importStore.previewResult.errorRows }}</strong></article>
            </section>

            <PrimeMessage v-if="importStore.previewResult?.errorRows" class="mt-3" severity="error" :closable="false">
              预览存在错误行，必须修正后重新上传，才允许应用导入。
            </PrimeMessage>
            <PrimeMessage v-else-if="importStore.previewResult?.warningRows" class="mt-3" severity="warn" :closable="false">
              预览存在警告行，可二次确认后应用。请确认这些都是演示数据。
            </PrimeMessage>

            <PrimeDataTable v-if="previewRows.length" class="warm-import-table mt-4" :value="previewRows" striped-rows scrollable scroll-height="300px">
              <PrimeColumn field="rowNumber" header="行号" style="width: 80px" />
              <PrimeColumn header="状态" style="width: 100px">
                <template #body="{ data }">
                  <PrimeTag :severity="statusSeverity(data.status)" :value="statusLabel(data.status)" />
                </template>
              </PrimeColumn>
              <PrimeColumn v-for="column in previewColumns" :key="column" :field="`data.${column}`" :header="column" />
              <PrimeColumn header="提示">
                <template #body="{ data }">
                  <span class="import-row-message">{{ data.messages.join('；') || '通过' }}</span>
                </template>
              </PrimeColumn>
            </PrimeDataTable>
          </PrimeTabPanel>

          <PrimeTabPanel value="history">
            <PrimeDataTable class="warm-import-table" :value="importStore.importHistory" striped-rows scrollable scroll-height="420px">
              <PrimeColumn header="时间">
                <template #body="{ data }">{{ dayjs(data.createdAt).format('MM-DD HH:mm') }}</template>
              </PrimeColumn>
              <PrimeColumn field="importTypeLabel" header="类型" />
              <PrimeColumn field="operatorName" header="操作人" />
              <PrimeColumn field="totalRows" header="行数" />
              <PrimeColumn header="状态">
                <template #body="{ data }">
                  <PrimeTag :severity="data.status === '成功' ? 'success' : 'warn'" :value="data.status" />
                </template>
              </PrimeColumn>
              <PrimeColumn header="操作">
                <template #body="{ data }">
                  <PrimeButton size="small" severity="secondary" label="回滚预览" @click="showRollbackPreview(data.id)">
                    <template #icon><RotateCcw :size="14" /></template>
                  </PrimeButton>
                </template>
              </PrimeColumn>
            </PrimeDataTable>
            <PrimeMessage v-if="rollbackText" class="mt-3" severity="warn" :closable="false">
              {{ rollbackText }}
            </PrimeMessage>
          </PrimeTabPanel>

          <PrimeTabPanel value="guide">
            <div class="import-template-grid">
              <article v-for="template in importStore.importTypes" :key="template.type" class="import-template-card">
                <PrimeTag severity="warn" :value="template.label" />
                <h4>{{ template.description }}</h4>
                <p v-for="field in template.fields" :key="field.field">
                  <strong>{{ field.field }}</strong>
                  <span>{{ field.required ? '必填' : '选填' }} · {{ field.description }}</span>
                </p>
              </article>
            </div>
          </PrimeTabPanel>
        </PrimeTabPanels>
      </PrimeTabs>
    </div>

    <template #footer>
      <PrimeButton severity="secondary" label="关闭" @click="dialogVisible = false" />
    </template>
  </PrimeDialog>
</template>
