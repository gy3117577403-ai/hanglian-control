<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { ClipboardCheck, FileClock, History, PackageSearch, ShieldAlert, Wrench } from 'lucide-vue-next'
import { useToast } from 'primevue/usetoast'
import WarmPermissionDenied from '@/components/auth/WarmPermissionDenied.vue'
import WarmKnowledgeMaintenancePanel from '@/components/knowledge/WarmKnowledgeMaintenancePanel.vue'
import { PERMISSIONS } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth-store'
import { useMaintenanceStore } from '@/stores/maintenance-store'
import type { MaintenanceEntityType, Permission } from '@/types/production'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  changed: []
}>()

type FieldConfig = {
  key: string
  label: string
  type?: 'text' | 'number' | 'textarea' | 'select'
  options?: Array<{ label: string; value: string }>
}

const maintenanceStore = useMaintenanceStore()
const auth = useAuthStore()
const toast = useToast()
const editorVisible = ref(false)
const editEntity = ref<MaintenanceEntityType | null>(null)
const editId = ref('')
const editTitle = ref('')
const editFields = ref<FieldConfig[]>([])
const editForm = reactive<Record<string, string | number | string[] | undefined>>({})

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const tabItems = [
  { value: 'overview', label: '概览' },
  { value: 'customers', label: '客户' },
  { value: 'products', label: '产品' },
  { value: 'plans', label: '生产计划' },
  { value: 'front', label: '前段参数' },
  { value: 'back', label: '后段资料包' },
  { value: 'documents', label: '文件资料' },
  { value: 'knowledge', label: '现场知识库' },
  { value: 'review', label: '复核队列' },
  { value: 'history', label: '维护历史' },
]

const commonStatusOptions = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
  { label: '待复核', value: 'pending_review' },
]

const planStatusOptions = [
  { label: '待生产', value: '待生产' },
  { label: '生产中', value: '生产中' },
  { label: '已完成', value: '已完成' },
  { label: '异常', value: '异常' },
]

const materialStatusOptions = [
  { label: '有效', value: '有效' },
  { label: '待确认', value: '待确认' },
  { label: '失效', value: '失效' },
]

const documentStatusOptions = [
  { label: '有效', value: 'effective' },
  { label: '待复核', value: 'pending_review' },
  { label: '已失效', value: 'expired' },
  { label: '缺失', value: 'missing' },
  { label: '不一致', value: 'inconsistent' },
]

const processOptions = [
  { label: '前段', value: 'front' },
  { label: '后段', value: 'back' },
  { label: '通用', value: 'common' },
]

const overviewCards = computed(() => [
  { label: '客户', value: maintenanceStore.summary.customers, icon: PackageSearch },
  { label: '产品', value: maintenanceStore.summary.products, icon: ClipboardCheck },
  { label: '计划', value: maintenanceStore.summary.productionPlans, icon: FileClock },
  { label: '文件', value: maintenanceStore.summary.documents, icon: History },
  { label: '待复核', value: maintenanceStore.summary.pendingReview, icon: ShieldAlert, danger: maintenanceStore.summary.pendingReview > 0 },
])

const entityPermissionMap: Partial<Record<MaintenanceEntityType, Permission>> = {
  customer: PERMISSIONS.MAINTENANCE_CUSTOMER_UPDATE,
  product: PERMISSIONS.MAINTENANCE_PRODUCT_UPDATE,
  production_plan: PERMISSIONS.MAINTENANCE_PLAN_UPDATE,
  front_parameter: PERMISSIONS.MAINTENANCE_PARAMETER_UPDATE,
  back_package: PERMISSIONS.MAINTENANCE_PACKAGE_UPDATE,
  document: PERMISSIONS.MAINTENANCE_DOCUMENT_UPDATE,
}

const canViewMaintenance = computed(() => auth.hasPermission(PERMISSIONS.MAINTENANCE_VIEW))
const canSetEffective = computed(() => auth.hasPermission(PERMISSIONS.DOCUMENT_SET_EFFECTIVE))
const canResolveReview = computed(() => auth.hasPermission(PERMISSIONS.MAINTENANCE_REVIEW_RESOLVE))

function canEditEntity(entity: MaintenanceEntityType) {
  const permission = entityPermissionMap[entity]
  return permission ? auth.hasPermission(permission) : false
}

function deny() {
  toast.add({ severity: 'error', summary: '当前角色无权执行该操作。', detail: '请在右上角切换到具备权限的 Mock 角色。', life: 2600 })
}

function statusSeverity(status?: string) {
  if (!status) return 'info'
  if (['active', '有效', 'effective', '已完成', '已确认'].includes(status)) return 'success'
  if (['pending_review', '待确认', '待生产', '生产中', '需复核'].includes(status)) return 'warn'
  if (['inactive', '失效', 'expired', 'missing', 'inconsistent', '异常'].includes(status)) return 'danger'
  return 'info'
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    active: '启用',
    inactive: '停用',
    pending_review: '待复核',
    effective: '有效',
    expired: '已失效',
    missing: '缺失',
    inconsistent: '不一致',
    front: '前段',
    back: '后段',
    common: '通用',
  }
  return status ? labels[status] ?? status : '-'
}

function progressClass(value?: number) {
  if ((value ?? 0) >= 95) return 'maintenance-progress-ok'
  if ((value ?? 0) >= 90) return 'maintenance-progress-warn'
  return 'maintenance-progress-danger'
}

function setFields(fields: FieldConfig[], values: Record<string, unknown>) {
  editFields.value = fields
  for (const key of Object.keys(editForm)) delete editForm[key]
  for (const field of fields) {
    const value = values[field.key]
    editForm[field.key] = Array.isArray(value) ? value.join(',') : (value as string | number | undefined)
  }
}

function openEditor(entity: MaintenanceEntityType, row: Record<string, unknown>) {
  if (!canEditEntity(entity)) return deny()
  editEntity.value = entity
  editId.value = String(row.id)
  editTitle.value = `${entityTitle(entity)} / ${row.productCode ?? row.customerName ?? row.title ?? row.id}`

  if (entity === 'customer') {
    setFields([
      { key: 'customerName', label: '客户名称' },
      { key: 'customerShortName', label: '客户简称' },
      { key: 'sales', label: '销售' },
      { key: 'status', label: '状态', type: 'select', options: commonStatusOptions },
      { key: 'remark', label: '维护原因', type: 'textarea' },
    ], row)
  }

  if (entity === 'product') {
    setFields([
      { key: 'productName', label: '产品名称' },
      { key: 'productVersion', label: '产品版本' },
      { key: 'productCategory', label: '产品类别' },
      { key: 'status', label: '状态', type: 'select', options: commonStatusOptions },
      { key: 'remark', label: '维护原因', type: 'textarea' },
    ], row)
  }

  if (entity === 'production_plan') {
    setFields([
      { key: 'planDate', label: '计划日期' },
      { key: 'weekPlanCode', label: '周计划编号' },
      { key: 'plannedQuantity', label: '计划数量', type: 'number' },
      { key: 'completedQuantity', label: '完成数量', type: 'number' },
      { key: 'planStatus', label: '计划状态', type: 'select', options: planStatusOptions },
      { key: 'responsiblePerson', label: '负责人' },
      { key: 'remark', label: '维护原因', type: 'textarea' },
    ], row)
  }

  if (entity === 'front_parameter') {
    setFields([
      { key: 'cutLength', label: '裁线长度' },
      { key: 'stripLength', label: '剥皮长度' },
      { key: 'terminalModel', label: '端子型号' },
      { key: 'pullForceStandard', label: '拉力标准' },
      { key: 'crimpHeight', label: '压接高度' },
      { key: 'drawingVersion', label: '图纸版本' },
      { key: 'parameterStatus', label: '参数状态', type: 'select', options: materialStatusOptions },
      { key: 'remark', label: '维护原因', type: 'textarea' },
    ], {
      ...row,
      cutLength: row.wireLength,
      stripLength: row.strippingLength,
    })
  }

  if (entity === 'back_package') {
    setFields([
      { key: 'connectorModel', label: '连接器型号' },
      { key: 'connectorManual', label: '装配说明书' },
      { key: 'pinoutDiagram', label: '插接孔位图' },
      { key: 'processSop', label: '作业流程 SOP' },
      { key: 'finishedDetailImageCount', label: '成品细节图数量', type: 'number' },
      { key: 'drawingVersion', label: '图纸版本' },
      { key: 'sopVersion', label: 'SOP 版本' },
      { key: 'packageStatus', label: '资料状态', type: 'select', options: materialStatusOptions },
      { key: 'remark', label: '维护原因', type: 'textarea' },
    ], {
      ...row,
      connectorManual: row.assemblyManual,
      pinoutDiagram: row.pinMap,
      processSop: row.sop,
      finishedDetailImageCount: row.finishedImageCount,
      packageStatus: row.materialStatus,
    })
  }

  if (entity === 'document') {
    setFields([
      { key: 'title', label: '文件标题' },
      { key: 'version', label: '版本' },
      { key: 'status', label: '文件状态', type: 'select', options: documentStatusOptions },
      { key: 'requiredForProcess', label: '适用工序', type: 'select', options: processOptions },
      { key: 'remark', label: '维护原因', type: 'textarea' },
    ], row)
  }

  editorVisible.value = true
}

function entityTitle(entity: MaintenanceEntityType) {
  const labels: Record<MaintenanceEntityType, string> = {
    customer: '客户资料',
    product: '产品资料',
    production_plan: '生产计划',
    front_parameter: '前段参数',
    back_package: '后段资料包',
    document: '文件资料',
    import_record: '导入记录',
    review_queue: '复核队列',
  }
  return labels[entity]
}

async function submitEditor() {
  if (!editEntity.value || !editId.value) return
  if (!canEditEntity(editEntity.value)) return deny()
  const payload: Record<string, unknown> = {}
  for (const field of editFields.value) {
    payload[field.key] = editForm[field.key]
  }
  await maintenanceStore.updateEntity(editEntity.value, editId.value, payload)
  editorVisible.value = false
  emit('changed')
}

async function markEffective(id: string) {
  if (!canSetEffective.value) return deny()
  await maintenanceStore.markDocumentEffective(id, 'V2.1 资料维护中心设为当前有效版本')
  emit('changed')
}

async function resolveReview(id: string, action: 'mark_reviewed' | 'mark_pending' | 'mark_inconsistent') {
  if (!canResolveReview.value) return deny()
  await maintenanceStore.resolveReview(id, action, 'V2.1 资料维护中心复核处理')
  emit('changed')
}

async function searchCurrentTab() {
  await maintenanceStore.loadTab(maintenanceStore.activeTab)
}

async function onTabChange(value: string | number) {
  await maintenanceStore.loadTab(String(value) as never)
}

watch(dialogVisible, async (visible) => {
  if (!visible) return
  await maintenanceStore.loadAll()
})
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="资料维护中心" class="maintenance-center-dialog">
    <div class="grid max-h-[80vh] gap-4 overflow-auto pr-1">
      <section class="maintenance-hero system-hero-panel">
        <Wrench :size="42" />
        <div>
          <p class="section-kicker">V2.1 / LOCAL MOCK MAINTENANCE</p>
          <h3>线束车间资料维护中心演示版</h3>
          <p>仅维护本地 Mock / metadata 演示数据，记录维护历史，不连接 Sealos，不上传真实客户资料。</p>
        </div>
        <PrimeTag severity="warn" value="资料维护演示" />
      </section>

      <PrimeMessage v-if="maintenanceStore.errorMessage" severity="error" :closable="false">
        {{ maintenanceStore.errorMessage }}
      </PrimeMessage>
      <WarmPermissionDenied
        v-if="!canViewMaintenance"
        title="当前角色不能访问资料维护中心"
        description="请切换到资料维护、工艺、品质或管理员角色。"
      />
      <PrimeMessage v-else-if="maintenanceStore.hasReviewRisk" severity="warn" :closable="false">
        当前存在待复核、失效或不一致资料，建议先进入“复核队列”和“文件资料”处理。
      </PrimeMessage>

      <div class="maintenance-search-strip">
        <PrimeInputText
          v-model="maintenanceStore.keyword"
          placeholder="搜索客户、产品、计划、端子、连接器、SOP、图纸版本"
          @keydown.enter="searchCurrentTab"
        />
        <PrimeButton label="搜索当前页" :loading="maintenanceStore.loading" @click="searchCurrentTab" />
      </div>

      <PrimeTabs v-model:value="maintenanceStore.activeTab" @update:value="onTabChange">
        <PrimeTabList class="maintenance-tab-list">
          <PrimeTab v-for="tab in tabItems" :key="tab.value" :value="tab.value">{{ tab.label }}</PrimeTab>
        </PrimeTabList>
        <PrimeTabPanels>
          <PrimeTabPanel value="overview">
            <section class="maintenance-summary-grid">
              <article v-for="card in overviewCards" :key="card.label" :class="{ danger: card.danger }">
                <component :is="card.icon" :size="24" />
                <span>{{ card.label }}</span>
                <strong>{{ card.value }}</strong>
              </article>
            </section>
            <div class="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <section class="maintenance-panel">
                <h4>复核优先项</h4>
                <PrimeDataTable :value="maintenanceStore.reviewQueue.slice(0, 6)" striped-rows>
                  <PrimeColumn field="type" header="类型" />
                  <PrimeColumn field="product" header="产品" />
                  <PrimeColumn field="message" header="提示" />
                </PrimeDataTable>
              </section>
              <section class="maintenance-panel">
                <h4>最近维护</h4>
                <PrimeTimeline :value="maintenanceStore.history.slice(0, 5)">
                  <template #content="{ item }">
                    <strong>{{ entityTitle(item.entityType) }}</strong>
                    <p>{{ item.action }} / {{ item.operatorName }} / {{ dayjs(item.createdAt).format('MM-DD HH:mm') }}</p>
                  </template>
                </PrimeTimeline>
              </section>
            </div>
          </PrimeTabPanel>

          <PrimeTabPanel value="customers">
            <PrimeDataTable :value="maintenanceStore.customers" striped-rows scrollable scroll-height="470px">
              <PrimeColumn field="customerName" header="客户" />
              <PrimeColumn field="customerShortName" header="简称" />
              <PrimeColumn field="sales" header="销售" />
              <PrimeColumn field="productCount" header="产品数" />
              <PrimeColumn header="状态"><template #body="{ data }"><PrimeTag :severity="statusSeverity(data.status)" :value="statusLabel(data.status)" /></template></PrimeColumn>
              <PrimeColumn header="操作"><template #body="{ data }"><PrimeButton size="small" label="维护" :disabled="!canEditEntity('customer')" title="当前角色无权执行该操作" @click="openEditor('customer', data)" /></template></PrimeColumn>
            </PrimeDataTable>
          </PrimeTabPanel>

          <PrimeTabPanel value="products">
            <PrimeDataTable :value="maintenanceStore.products" striped-rows scrollable scroll-height="470px">
              <PrimeColumn field="customer" header="客户" />
              <PrimeColumn field="productCode" header="产品编号" />
              <PrimeColumn field="productName" header="产品名称" />
              <PrimeColumn field="productVersion" header="版本" />
              <PrimeColumn field="productCategory" header="类别" />
              <PrimeColumn header="状态"><template #body="{ data }"><PrimeTag :severity="statusSeverity(data.status)" :value="statusLabel(data.status)" /></template></PrimeColumn>
              <PrimeColumn header="操作"><template #body="{ data }"><PrimeButton size="small" label="维护" :disabled="!canEditEntity('product')" title="当前角色无权执行该操作" @click="openEditor('product', data)" /></template></PrimeColumn>
            </PrimeDataTable>
          </PrimeTabPanel>

          <PrimeTabPanel value="plans">
            <PrimeDataTable :value="maintenanceStore.productionPlans" striped-rows scrollable scroll-height="470px">
              <PrimeColumn field="planDate" header="日期" />
              <PrimeColumn field="weekPlanCode" header="周计划" />
              <PrimeColumn field="customer" header="客户" />
              <PrimeColumn field="productCode" header="产品" />
              <PrimeColumn header="完整度">
                <template #body="{ data }">
                  <span :class="['maintenance-progress-pill', progressClass(data.materialCompleteness)]">{{ data.materialCompleteness }}%</span>
                </template>
              </PrimeColumn>
              <PrimeColumn header="状态"><template #body="{ data }"><PrimeTag :severity="statusSeverity(data.planStatus)" :value="statusLabel(data.planStatus)" /></template></PrimeColumn>
              <PrimeColumn header="操作"><template #body="{ data }"><PrimeButton size="small" label="维护" :disabled="!canEditEntity('production_plan')" title="当前角色无权执行该操作" @click="openEditor('production_plan', data)" /></template></PrimeColumn>
            </PrimeDataTable>
          </PrimeTabPanel>

          <PrimeTabPanel value="front">
            <PrimeDataTable :value="maintenanceStore.frontParameters" striped-rows scrollable scroll-height="470px">
              <PrimeColumn field="customer" header="客户" />
              <PrimeColumn field="productCode" header="产品" />
              <PrimeColumn field="wireLength" header="裁线长度" />
              <PrimeColumn field="strippingLength" header="剥皮长度" />
              <PrimeColumn field="terminalModel" header="端子型号" />
              <PrimeColumn field="pullForceStandard" header="拉力标准" />
              <PrimeColumn field="crimpHeight" header="压接高度" />
              <PrimeColumn header="状态"><template #body="{ data }"><PrimeTag :severity="statusSeverity(data.parameterStatus)" :value="statusLabel(data.parameterStatus)" /></template></PrimeColumn>
              <PrimeColumn header="操作"><template #body="{ data }"><PrimeButton size="small" label="维护" :disabled="!canEditEntity('front_parameter')" title="当前角色无权执行该操作" @click="openEditor('front_parameter', data)" /></template></PrimeColumn>
            </PrimeDataTable>
          </PrimeTabPanel>

          <PrimeTabPanel value="back">
            <PrimeDataTable :value="maintenanceStore.backPackages" striped-rows scrollable scroll-height="470px">
              <PrimeColumn field="customer" header="客户" />
              <PrimeColumn field="productCode" header="产品" />
              <PrimeColumn field="connectorModel" header="连接器" />
              <PrimeColumn field="assemblyManual" header="装配说明书" />
              <PrimeColumn field="pinMap" header="孔位图" />
              <PrimeColumn field="sop" header="SOP" />
              <PrimeColumn field="finishedImageCount" header="成品图" />
              <PrimeColumn header="状态"><template #body="{ data }"><PrimeTag :severity="statusSeverity(data.materialStatus)" :value="statusLabel(data.materialStatus)" /></template></PrimeColumn>
              <PrimeColumn header="操作"><template #body="{ data }"><PrimeButton size="small" label="维护" :disabled="!canEditEntity('back_package')" title="当前角色无权执行该操作" @click="openEditor('back_package', data)" /></template></PrimeColumn>
            </PrimeDataTable>
          </PrimeTabPanel>

          <PrimeTabPanel value="documents">
            <PrimeDataTable :value="maintenanceStore.documents" striped-rows scrollable scroll-height="470px">
              <PrimeColumn field="customer" header="客户" />
              <PrimeColumn field="productCode" header="产品" />
              <PrimeColumn field="title" header="资料标题" />
              <PrimeColumn field="documentType" header="类型" />
              <PrimeColumn field="version" header="版本" />
              <PrimeColumn field="fileHealth" header="文件状态" />
              <PrimeColumn header="状态"><template #body="{ data }"><PrimeTag :severity="statusSeverity(data.status)" :value="statusLabel(data.status)" /></template></PrimeColumn>
              <PrimeColumn header="操作">
                <template #body="{ data }">
                  <div class="flex gap-2">
                    <PrimeButton size="small" label="维护" :disabled="!canEditEntity('document')" title="当前角色无权执行该操作" @click="openEditor('document', data)" />
                    <PrimeButton size="small" severity="warn" label="设为有效" :disabled="!canSetEffective" title="当前角色无权执行该操作" @click="markEffective(data.id)" />
                  </div>
                </template>
              </PrimeColumn>
            </PrimeDataTable>
          </PrimeTabPanel>

          <PrimeTabPanel value="knowledge">
            <WarmKnowledgeMaintenancePanel />
          </PrimeTabPanel>

          <PrimeTabPanel value="review">
            <PrimeDataTable :value="maintenanceStore.reviewQueue" striped-rows scrollable scroll-height="470px">
              <PrimeColumn field="type" header="复核类型" />
              <PrimeColumn field="customer" header="客户" />
              <PrimeColumn field="product" header="产品" />
              <PrimeColumn field="message" header="问题描述" />
              <PrimeColumn field="recommendedAction" header="建议动作" />
              <PrimeColumn header="处理">
                <template #body="{ data }">
                  <div class="flex flex-wrap gap-2">
                    <PrimeButton size="small" severity="success" label="已复核" :disabled="!canResolveReview" title="当前角色无权执行该操作" @click="resolveReview(data.id, 'mark_reviewed')" />
                    <PrimeButton size="small" severity="warn" label="待确认" :disabled="!canResolveReview" title="当前角色无权执行该操作" @click="resolveReview(data.id, 'mark_pending')" />
                    <PrimeButton size="small" severity="danger" label="不一致" :disabled="!canResolveReview" title="当前角色无权执行该操作" @click="resolveReview(data.id, 'mark_inconsistent')" />
                  </div>
                </template>
              </PrimeColumn>
            </PrimeDataTable>
          </PrimeTabPanel>

          <PrimeTabPanel value="history">
            <PrimeDataTable :value="maintenanceStore.history" striped-rows scrollable scroll-height="470px">
              <PrimeColumn header="时间"><template #body="{ data }">{{ dayjs(data.createdAt).format('MM-DD HH:mm') }}</template></PrimeColumn>
              <PrimeColumn header="对象"><template #body="{ data }">{{ entityTitle(data.entityType) }}</template></PrimeColumn>
              <PrimeColumn field="entityId" header="对象 ID" />
              <PrimeColumn field="action" header="动作" />
              <PrimeColumn field="operatorName" header="维护人" />
              <PrimeColumn field="reason" header="原因" />
            </PrimeDataTable>
          </PrimeTabPanel>
        </PrimeTabPanels>
      </PrimeTabs>
    </div>

    <PrimeDialog v-model:visible="editorVisible" modal :header="editTitle" class="maintenance-editor-dialog">
      <div class="maintenance-editor-grid">
        <label v-for="field in editFields" :key="field.key">
          <span>{{ field.label }}</span>
          <PrimeTextarea v-if="field.type === 'textarea'" v-model="editForm[field.key]" rows="3" />
          <PrimeSelect
            v-else-if="field.type === 'select'"
            v-model="editForm[field.key]"
            :options="field.options"
            option-label="label"
            option-value="value"
          />
          <PrimeInputText v-else v-model="editForm[field.key]" :type="field.type === 'number' ? 'number' : 'text'" />
        </label>
      </div>
      <template #footer>
        <PrimeButton severity="secondary" label="取消" @click="editorVisible = false" />
        <PrimeButton label="保存维护记录" :disabled="editEntity ? !canEditEntity(editEntity) : true" :loading="maintenanceStore.saving" @click="submitEditor" />
      </template>
    </PrimeDialog>
  </PrimeDialog>
</template>
