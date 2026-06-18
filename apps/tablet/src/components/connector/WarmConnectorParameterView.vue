<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Database, Download, FileSpreadsheet, Plus, RefreshCw, Ruler, Trash2 } from 'lucide-vue-next'
import WarmConnectorDetailDialog from './WarmConnectorDetailDialog.vue'
import WarmConnectorTable from './WarmConnectorTable.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { ConnectorParameter, ConnectorParameterPayload } from '@/types/production'

const store = useDocumentHubStore()

const fileInput = ref<HTMLInputElement | null>(null)
const editorOpen = ref(false)
const importResultOpen = ref(false)
const deleteOpen = ref(false)
const editingId = ref<string | null>(null)
const deletingRow = ref<ConnectorParameter | null>(null)
const pendingImportFile = ref<File | null>(null)

const form = reactive({
  connectorModel: '',
  specification: '',
  insertionLengthMm: '',
  outerStripLengthMm: '',
  innerStripLengthMm: '',
  status: '启用',
  remark: '',
})

const totalLabel = computed(() => `${store.connectorRows.length} 条`)
const blankOuterLabel = computed(() => `${store.connectorRows.filter((row) => row.outerStripLengthMm === null || row.outerStripLengthMm === undefined).length} 条`)
const reviewLabel = computed(() => `${store.connectorRows.filter((row) => row.status === '复核中').length} 条`)
const disabledLabel = computed(() => `${store.connectorRows.filter((row) => row.status === '停用').length} 条`)
const hasBlankOuter = computed(() => store.connectorRows.some((row) => row.outerStripLengthMm === null || row.outerStripLengthMm === undefined))
const hasReviewRows = computed(() => store.connectorRows.some((row) => row.status === '复核中'))
const hasDisabledRows = computed(() => store.connectorRows.some((row) => row.status === '停用'))
const statusOptions = ['启用', '复核中', '停用']
const importHasIssueRows = computed(() => Boolean(store.connectorImportResult?.rows.some((row) => !row.valid)))
const importRequiresDecision = computed(() => Boolean(store.connectorImportResult?.requiresDecision || store.connectorImportResult?.requiresOverwrite))
const importPreviewRows = computed(() => store.connectorImportResult?.rows.slice(0, 20) ?? [])
const importSummaryText = computed(() => {
  const result = store.connectorImportResult
  if (!result) return ''
  if (result.requiresDecision || result.requiresOverwrite) {
    return `本次读取 ${result.totalRows} 行，${result.validRows ?? 0} 行可导入，${result.errorRows ?? 0} 行格式需修正，${result.duplicateRows?.length ?? 0} 行重复。当前尚未写入，请选择跳过重复、覆盖重复或取消。`
  }
  return `本次读取 ${result.totalRows} 行，成功导入 ${result.importedRows} 行，跳过 ${result.skippedRows} 行。`
})

const actionLabels: Record<string, string> = {
  created: '新增',
  updated: '更新',
  skipped: '跳过',
  conflict: '重复',
  error: '错误',
}

function cleanRemark(value?: string) {
  const remark = value?.trim() ?? ''
  return remark.includes('?') ? '' : remark
}

function optionalNumber(value: string) {
  const text = value.trim()
  return text ? Number(text) : null
}

function resetForm() {
  editingId.value = null
  form.connectorModel = ''
  form.specification = ''
  form.insertionLengthMm = ''
  form.outerStripLengthMm = ''
  form.innerStripLengthMm = ''
  form.status = '启用'
  form.remark = ''
}

function openCreate() {
  resetForm()
  editorOpen.value = true
}

function openEdit(row: ConnectorParameter) {
  editingId.value = row.connectorId
  form.connectorModel = row.connectorModel
  form.specification = row.specification ?? ''
  form.insertionLengthMm = String(row.insertionLengthMm ?? '')
  form.outerStripLengthMm = String(row.outerStripLengthMm ?? '')
  form.innerStripLengthMm = String(row.innerStripLengthMm ?? '')
  form.status = row.status || '启用'
  form.remark = cleanRemark(row.remark)
  editorOpen.value = true
}

function toPayload(): ConnectorParameterPayload {
  return {
    connectorModel: form.connectorModel,
    specification: form.specification,
    insertionLengthMm: Number(form.insertionLengthMm),
    outerStripLengthMm: optionalNumber(form.outerStripLengthMm),
    innerStripLengthMm: Number(form.innerStripLengthMm),
    status: form.status,
    remark: form.remark,
  }
}

async function submitConnector() {
  const saved = await store.saveConnector(toPayload(), editingId.value ?? undefined)
  if (saved) {
    editorOpen.value = false
    resetForm()
  }
}

function requestDelete(row: ConnectorParameter) {
  deletingRow.value = row
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deletingRow.value) return
  const deleted = await store.deleteConnector(deletingRow.value)
  if (deleted) {
    deleteOpen.value = false
    deletingRow.value = null
  }
}

function triggerImport() {
  fileInput.value?.click()
}

function downloadConnectorTemplate() {
  const rows = [
    ['型号', '规格', '入长mm', '外剥皮mm', '内剥皮mm', '备注'],
    ['PL182X-301-50', '50P 插件端', '65', '26.5', '17.5', '外剥可留空'],
    ['HVC2PG80FS150', '150 规格', '65', '', '15.5', '无外剥参数时留空'],
  ]
  const lines = rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(','))
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '连接器参数导入模板.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  pendingImportFile.value = file
  const result = await store.importConnectorExcel(file)
  if (result && !result.requiresDecision && !result.requiresOverwrite) pendingImportFile.value = null
  if (result || store.connectorImportError) importResultOpen.value = true
}

function cancelImportConflict() {
  importResultOpen.value = false
  pendingImportFile.value = null
}

async function importWithStrategy(strategy: 'skip' | 'overwrite') {
  if (!pendingImportFile.value) return
  const result = await store.importConnectorExcel(pendingImportFile.value, strategy)
  if (result && !result.requiresDecision && !result.requiresOverwrite) {
    pendingImportFile.value = null
  }
  if (result || store.connectorImportError) importResultOpen.value = true
}

function downloadImportReport() {
  const result = store.connectorImportResult
  if (!result) return
  const issueRows = result.rows.filter((row) => !row.valid)
  const header = ['行号', '型号', '规格', '处理状态', '问题', '建议']
  const lines = [
    header.join(','),
    ...issueRows.map((row) => [
      row.rowNumber,
      row.connectorModel,
      row.specification ?? '',
      actionLabels[row.action] ?? row.action,
      row.message,
      row.resolution ?? row.issues?.map((issue) => issue.resolution).join('；') ?? '',
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')),
  ]
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `连接器导入错误报告-${Date.now()}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="parameter-view">
    <section class="view-head">
      <div class="title-block">
        <i><Database :size="22" /></i>
        <div>
          <p>连接器数据库参数</p>
          <h2>连接器工艺参数库</h2>
          <small>外剥可留空，错误行自动跳过并给出报告</small>
        </div>
      </div>

      <div class="head-tools">
        <span class="metric-pill"><Ruler :size="15" />单位 mm</span>
        <span class="metric-pill total">{{ totalLabel }}</span>
        <span v-if="hasBlankOuter" class="metric-pill warning">外剥空 {{ blankOuterLabel }}</span>
        <span v-if="hasReviewRows" class="metric-pill review">复核 {{ reviewLabel }}</span>
        <span v-if="hasDisabledRows" class="metric-pill muted">停用 {{ disabledLabel }}</span>
        <button type="button" class="tool-button ghost" title="刷新" @click="store.loadConnectors(store.searchKeyword)">
          <RefreshCw :size="17" />
        </button>
        <button type="button" class="tool-button ghost" title="下载 Excel 导入模板" @click="downloadConnectorTemplate">
          <Download :size="17" />
        </button>
        <button type="button" class="tool-button" :disabled="store.connectorMutationLoading" @click="triggerImport">
          <FileSpreadsheet :size="18" />
          <span>{{ store.connectorMutationLoading ? '正在解析' : 'Excel 导入' }}</span>
        </button>
        <button type="button" class="tool-button primary" @click="openCreate">
          <Plus :size="18" />
          <span>单型号导入</span>
        </button>
      </div>
    </section>

    <input
      ref="fileInput"
      class="hidden-input"
      type="file"
      accept=".xlsx,.xls"
      @change="handleFileChange"
    >

    <div class="scroll-area" data-scroll-key="connectors">
      <WarmConnectorTable
        :rows="store.connectorRows"
        @open="store.openConnectorDetail"
        @edit="openEdit"
        @delete="requestDelete"
      />
    </div>

    <WarmConnectorDetailDialog />

    <PrimeDialog v-model:visible="editorOpen" modal :header="editingId ? '编辑连接器参数' : '单型号导入'" :style="{ width: '720px' }">
      <div class="editor-panel">
        <label class="field full">
          <span>连接器型号</span>
          <PrimeInputText v-model="form.connectorModel" placeholder="例如 CONN-16P-A" />
        </label>

        <label class="field full">
          <span>规格</span>
          <PrimeInputText v-model="form.specification" placeholder="例如 16P 防水公端 / 白色母端 / 滑锁结构" />
        </label>

        <label class="field">
          <span>参数 1：入长（mm）</span>
          <PrimeInputText v-model="form.insertionLengthMm" type="number" inputmode="decimal" placeholder="18" />
        </label>

        <label class="field">
          <span>参数 2：外剥长度（mm）</span>
          <PrimeInputText v-model="form.outerStripLengthMm" type="number" inputmode="decimal" placeholder="可留空" />
        </label>

        <label class="field">
          <span>参数 3：内剥长度（mm）</span>
          <PrimeInputText v-model="form.innerStripLengthMm" type="number" inputmode="decimal" placeholder="4" />
        </label>

        <label class="field">
          <span>状态</span>
          <PrimeSelect v-model="form.status" :options="statusOptions" />
        </label>

        <label class="field full">
          <span>参数 4：备注 / 注意事项</span>
          <PrimeTextarea v-model="form.remark" rows="4" auto-resize placeholder="可留空" />
        </label>
      </div>

      <template #footer>
        <PrimeButton label="取消" severity="secondary" text @click="editorOpen = false" />
        <PrimeButton :label="editingId ? '保存修改' : '保存导入'" :loading="store.connectorMutationLoading" @click="submitConnector" />
      </template>
    </PrimeDialog>

    <PrimeDialog v-model:visible="deleteOpen" modal header="删除连接器参数" :style="{ width: '460px' }">
      <div class="delete-panel">
        <i><Trash2 :size="24" /></i>
        <div>
          <b>{{ deletingRow?.connectorModel }}</b>
          <p>删除后会从当前演示参数库移除。当前阶段仍为 Mock 数据，不会写入真实数据库。</p>
        </div>
      </div>

      <template #footer>
        <PrimeButton label="取消" severity="secondary" text @click="deleteOpen = false" />
        <PrimeButton label="确认删除" severity="danger" :loading="store.connectorMutationLoading" @click="confirmDelete" />
      </template>
    </PrimeDialog>

    <PrimeDialog v-model:visible="importResultOpen" modal :header="importRequiresDecision ? '发现重复连接器型号' : 'Excel 导入结果'" :style="{ width: '900px' }">
      <div v-if="store.connectorImportResult" class="import-result">
        <div v-if="importRequiresDecision" class="conflict-warning">
          <b>检测到重复型号，当前还没有写入任何数据。</b>
          <p>{{ importSummaryText }}</p>
          <p>选择“跳过重复并导入”会只导入可新增的正确行；选择“覆盖重复并导入”会用 Excel 中的数据更新已有同型号记录；选择“取消导入”则保持当前参数库不变。</p>
        </div>

        <div v-else-if="store.connectorImportResult.errorRows" class="conflict-warning soft">
          <b>部分行格式有问题，已跳过错误行。</b>
          <p>{{ importSummaryText }}</p>
          <p>请下载错误报告或按下方建议修改 Excel 后再次导入。</p>
        </div>

        <div v-else class="conflict-warning success">
          <b>Excel 导入完成。</b>
          <p>{{ importSummaryText }}</p>
        </div>

        <div class="result-metrics">
          <span><b>{{ store.connectorImportResult.totalRows }}</b>总行数</span>
          <span><b>{{ store.connectorImportResult.importedRows }}</b>导入成功</span>
          <span><b>{{ store.connectorImportResult.createdRows }}</b>新增</span>
          <span><b>{{ store.connectorImportResult.updatedRows }}</b>更新</span>
          <span><b>{{ store.connectorImportResult.skippedRows }}</b>跳过</span>
          <span><b>{{ store.connectorImportResult.errorRows ?? 0 }}</b>错误</span>
          <span><b>{{ store.connectorImportResult.duplicateRows?.length ?? 0 }}</b>重复</span>
        </div>

        <div class="result-list">
          <div v-for="row in importPreviewRows" :key="row.rowNumber" class="result-row" :class="{ invalid: !row.valid }">
            <span>第 {{ row.rowNumber }} 行</span>
            <b>{{ row.connectorModel }}</b>
            <small>{{ row.specification || '' }}</small>
            <strong>{{ row.message }}</strong>
            <small>{{ row.resolution || row.issues?.map((issue) => issue.resolution).join('；') || '' }}</small>
            <em>{{ actionLabels[row.action] ?? row.action }}</em>
          </div>
        </div>
        <p v-if="store.connectorImportResult.rows.length > importPreviewRows.length" class="result-note">
          当前只预览前 {{ importPreviewRows.length }} 条问题/处理记录，完整明细请下载错误报告。
        </p>
      </div>

      <div v-else-if="store.connectorImportError" class="import-error">
        <b>没有完成导入。</b>
        <p>{{ store.connectorImportError }}</p>
        <ul>
          <li>确认后端 API 已启动，前端能访问上传接口。</li>
          <li>Excel 第一行必须包含：型号、入长mm、内剥皮mm；外剥皮mm、规格、备注可选。</li>
          <li>长度列只填数字或小数；“参照图号”等说明请放到备注列。</li>
        </ul>
      </div>

      <template #footer>
        <PrimeButton v-if="importHasIssueRows" severity="secondary" text @click="downloadImportReport">
          <Download :size="16" />
          <span>下载错误报告</span>
        </PrimeButton>
        <template v-if="importRequiresDecision">
          <PrimeButton label="取消导入" severity="secondary" text @click="cancelImportConflict" />
          <PrimeButton label="跳过重复并导入" severity="secondary" :loading="store.connectorMutationLoading" @click="importWithStrategy('skip')" />
          <PrimeButton label="覆盖重复并导入" :loading="store.connectorMutationLoading" @click="importWithStrategy('overwrite')" />
        </template>
        <PrimeButton v-else label="知道了" @click="importResultOpen = false" />
      </template>
    </PrimeDialog>
  </div>
</template>

<style scoped>
.parameter-view {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  padding: 10px 14px 14px;
}

.view-head {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
  min-height: 82px;
  margin-bottom: 8px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 24px;
  background:
    linear-gradient(128deg, rgba(255, 255, 255, 0.82), rgba(255, 234, 201, 0.58) 50%, rgba(152, 194, 180, 0.36)),
    radial-gradient(circle at 88% 0%, rgba(255, 255, 255, 0.96), transparent 28%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    inset 0 -18px 36px rgba(125, 162, 150, 0.1),
    0 14px 34px rgba(76, 54, 32, 0.1);
  backdrop-filter: blur(20px);
}

.title-block {
  display: flex;
  min-width: 0;
  gap: 12px;
  align-items: center;
}

.title-block i {
  display: grid;
  flex: 0 0 48px;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.88), rgba(234, 202, 160, 0.68));
  color: #9b5125;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    0 12px 22px rgba(82, 51, 26, 0.12);
}

p,
h2,
small {
  margin: 0;
}

p {
  color: rgba(117, 78, 43, 0.78);
  font-size: 13px;
  font-weight: 950;
}

h2 {
  margin-top: 1px;
  color: #2f1d0f;
  font-size: 26px;
  font-weight: 950;
  letter-spacing: 0;
}

small {
  display: block;
  margin-top: 3px;
  color: rgba(92, 62, 37, 0.66);
  font-size: 12px;
  font-weight: 850;
}

.head-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
}

.metric-pill,
.tool-button {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.5);
  color: #7a421f;
  font-size: 14px;
  font-weight: 950;
  white-space: nowrap;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    0 9px 18px rgba(76, 54, 32, 0.08);
}

.metric-pill.total {
  color: #2f7b68;
}

.metric-pill.warning {
  color: #a75b24;
}

.metric-pill.review {
  color: #8f6b17;
}

.metric-pill.muted {
  color: rgba(83, 74, 65, 0.72);
}

.tool-button {
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}

.tool-button:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.72);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    0 12px 22px rgba(76, 54, 32, 0.12);
}

.tool-button.ghost {
  width: 38px;
  justify-content: center;
  padding: 0;
}

.tool-button.primary {
  border-color: rgba(210, 120, 54, 0.32);
  background: linear-gradient(145deg, rgba(223, 132, 55, 0.88), rgba(165, 84, 36, 0.92));
  color: #fff8ed;
}

.hidden-input {
  display: none;
}

.scroll-area {
  min-height: 0;
  overflow: auto;
  padding: 0 3px 3px 0;
  overscroll-behavior: contain;
}

.editor-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field {
  display: grid;
  gap: 7px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 18px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.76), rgba(250, 225, 190, 0.38)),
    radial-gradient(circle at 92% 12%, rgba(133, 180, 166, 0.2), transparent 42%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    0 12px 22px rgba(80, 42, 16, 0.07);
}

.field.full {
  grid-column: 1 / -1;
}

.field span {
  color: #76502e;
  font-size: 13px;
  font-weight: 900;
}

:deep(.p-inputtext),
:deep(.p-select),
:deep(textarea) {
  width: 100%;
  border-color: rgba(139, 90, 42, 0.2);
  border-radius: 14px;
  background: rgba(255, 252, 245, 0.86);
  color: #342112;
  font-weight: 850;
}

.delete-panel {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid rgba(185, 68, 53, 0.14);
  border-radius: 20px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.82), rgba(255, 225, 217, 0.42));
}

.delete-panel i {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 16px;
  background: rgba(185, 68, 53, 0.1);
  color: #b94435;
}

.delete-panel b {
  color: #2f1d0f;
  font-size: 19px;
  font-weight: 950;
}

.delete-panel p {
  margin-top: 6px;
  color: rgba(90, 59, 36, 0.72);
  line-height: 1.6;
}

.import-result {
  display: grid;
  gap: 12px;
}

.result-metrics {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
}

.result-metrics span,
.result-row {
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.result-metrics span {
  display: grid;
  gap: 4px;
  padding: 12px;
  color: #79512f;
  font-size: 13px;
  font-weight: 900;
}

.result-metrics b {
  color: #2f7b68;
  font-size: 26px;
  font-weight: 950;
}

.result-list {
  display: grid;
  gap: 8px;
  max-height: 260px;
  overflow: auto;
}

.conflict-warning {
  padding: 14px 16px;
  border: 1px solid rgba(185, 68, 53, 0.16);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.82), rgba(255, 226, 219, 0.42));
  color: #6e3d2d;
}

.conflict-warning b {
  display: block;
  color: #b94435;
  font-size: 17px;
  font-weight: 950;
}

.conflict-warning.soft b {
  color: #9b5125;
}

.conflict-warning.success {
  border-color: rgba(47, 123, 104, 0.18);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.82), rgba(218, 241, 232, 0.5));
}

.conflict-warning.success b {
  color: #2f7b68;
}

.conflict-warning p {
  margin-top: 5px;
  line-height: 1.55;
}

.result-row {
  display: grid;
  grid-template-columns: 84px 1fr 1fr 1.4fr 1.6fr 70px;
  gap: 10px;
  align-items: center;
  min-height: 44px;
  padding: 0 12px;
  color: #5e4328;
  font-weight: 850;
}

.result-row.invalid {
  background: rgba(255, 226, 219, 0.52);
}

.result-row em {
  justify-self: end;
  color: #9b5125;
  font-style: normal;
  font-weight: 950;
}

.result-row small {
  overflow: hidden;
  color: rgba(92, 62, 37, 0.72);
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-row strong {
  overflow: hidden;
  color: #5d3a21;
  font-size: 13px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-note {
  color: rgba(92, 62, 37, 0.72);
  font-size: 13px;
  font-weight: 900;
}

.import-error {
  display: grid;
  gap: 10px;
  padding: 18px;
  border: 1px solid rgba(185, 68, 53, 0.18);
  border-radius: 22px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.88), rgba(255, 226, 219, 0.5)),
    radial-gradient(circle at 92% 0%, rgba(255, 255, 255, 0.9), transparent 34%);
  color: #633624;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 14px 28px rgba(82, 48, 28, 0.1);
}

.import-error b {
  color: #b94435;
  font-size: 18px;
  font-weight: 950;
}

.import-error p,
.import-error ul {
  margin: 0;
}

.import-error ul {
  display: grid;
  gap: 6px;
  padding-left: 18px;
  font-size: 13px;
  font-weight: 850;
  line-height: 1.55;
}

@media (max-width: 1180px) {
  .view-head {
    align-items: flex-start;
  }

  h2 {
    font-size: 26px;
  }

  .tool-button span {
    display: none;
  }

  .result-metrics {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .result-row {
    grid-template-columns: 74px 1fr 1fr 1.3fr 64px;
  }

  .result-row small:nth-of-type(2) {
    display: none;
  }
}
</style>
