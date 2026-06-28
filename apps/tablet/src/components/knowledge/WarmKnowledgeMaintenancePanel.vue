<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { BookOpenCheck, Plus, RefreshCw } from 'lucide-vue-next'
import WarmPermissionDenied from '@/components/auth/WarmPermissionDenied.vue'
import WarmKnowledgeDetailDialog from '@/components/knowledge/WarmKnowledgeDetailDialog.vue'
import { PERMISSIONS } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth-store'
import { useKnowledgeStore } from '@/stores/knowledge-store'
import { useProductionStore } from '@/stores/production-store'
import type { AbnormalCaseKnowledge, FixtureKnowledge, KnowledgeBulkUpdatePayload, Permission, QualityStandardKnowledge } from '@/types/production'

type KnowledgeType = 'fixture' | 'abnormal_case' | 'quality_standard'
type KnowledgeItem = FixtureKnowledge | AbnormalCaseKnowledge | QualityStandardKnowledge
type MaintenanceTab = 'fixtures' | 'abnormal' | 'quality' | 'history'

const auth = useAuthStore()
const knowledge = useKnowledgeStore()
const production = useProductionStore()
const activeTab = ref<MaintenanceTab>('fixtures')
const editorVisible = ref(false)
const detailVisible = ref(false)
const editType = ref<KnowledgeType>('fixture')
const editId = ref('')
const selectedItem = ref<KnowledgeItem | null>(null)
const draft = reactive<Record<string, string>>({})

const tabs: Array<{ value: MaintenanceTab; label: string }> = [
  { value: 'fixtures', label: '治具库' },
  { value: 'abnormal', label: '异常库' },
  { value: 'quality', label: '质量标准' },
  { value: 'history', label: '维护历史' },
]

const createPermissionMap: Record<KnowledgeType, Permission> = {
  fixture: PERMISSIONS.KNOWLEDGE_FIXTURE_CREATE,
  abnormal_case: PERMISSIONS.KNOWLEDGE_ABNORMAL_CREATE,
  quality_standard: PERMISSIONS.KNOWLEDGE_QUALITY_CREATE,
}

const updatePermissionMap: Record<KnowledgeType, Permission> = {
  fixture: PERMISSIONS.KNOWLEDGE_FIXTURE_UPDATE,
  abnormal_case: PERMISSIONS.KNOWLEDGE_ABNORMAL_UPDATE,
  quality_standard: PERMISSIONS.KNOWLEDGE_QUALITY_UPDATE,
}

const canView = computed(() =>
  auth.hasPermission(PERMISSIONS.KNOWLEDGE_FIXTURE_VIEW)
  || auth.hasPermission(PERMISSIONS.KNOWLEDGE_ABNORMAL_VIEW)
  || auth.hasPermission(PERMISSIONS.KNOWLEDGE_QUALITY_VIEW),
)

const currentType = computed<KnowledgeType>(() =>
  activeTab.value === 'abnormal' ? 'abnormal_case' : activeTab.value === 'quality' ? 'quality_standard' : 'fixture',
)
const selectedCount = computed(() => knowledge.selectedKnowledgeRows.length)

function canCreate(type: KnowledgeType) {
  return auth.hasPermission(createPermissionMap[type])
}

function canUpdate(type: KnowledgeType) {
  return auth.hasPermission(updatePermissionMap[type])
}

function itemId(item: KnowledgeItem) {
  if ('fixtureId' in item) return item.fixtureId
  if ('abnormalId' in item) return item.abnormalId
  return item.qualityId
}

function isSelected(id: string) {
  return knowledge.selectedKnowledgeRows.includes(id)
}

function defaultProductFields() {
  const plan = production.selectedPlan
  return {
    customerId: plan.customerId ?? '',
    customerName: plan.customer,
    productId: plan.productId ?? '',
    productCode: plan.productCode,
    productName: plan.productName,
    processSegment: production.activeProcess,
  }
}

function resetDraft() {
  for (const key of Object.keys(draft)) delete draft[key]
  Object.assign(draft, defaultProductFields())
}

function openCreate(type: KnowledgeType) {
  editType.value = type
  editId.value = ''
  resetDraft()
  if (type === 'fixture') Object.assign(draft, {
    fixtureCode: `FIX-${production.selectedPlan.productCode}`,
    fixtureName: `${production.selectedPlan.productName} 现场治具`,
    fixtureType: '现场治具',
    applicableStation: production.activeProcess === 'front' ? '前段演示工位' : '后段演示工位',
    usageMethod: '按现场作业指导书使用。',
    checkStandard: '点检合格后允许生产。',
    maintenanceCycle: '每班点检',
    status: 'pending_review',
    keywords: '演示,治具',
  })
  if (type === 'abnormal_case') Object.assign(draft, {
    abnormalCode: `ABN-${production.selectedPlan.productCode}`,
    title: `${production.selectedPlan.productName} 现场异常`,
    station: production.activeProcess === 'front' ? '前段演示工位' : '后段演示工位',
    category: '现场异常',
    symptom: '现场发现异常现象。',
    cause: '待复盘原因。',
    solution: '隔离并按资料复核。',
    prevention: '纳入班前提醒。',
    severity: 'medium',
    status: 'pending_review',
    keywords: '演示,异常',
  })
  if (type === 'quality_standard') Object.assign(draft, {
    qualityCode: `QLT-${production.selectedPlan.productCode}`,
    title: `${production.selectedPlan.productName} 质量标准`,
    inspectionItem: '现场检验项目',
    standardValue: '按图纸/SOP 执行',
    tolerance: '不允许超差',
    inspectionMethod: '首件确认与过程抽检。',
    samplingRule: '首件必检',
    defectLevel: 'major',
    status: 'pending_review',
    keywords: '演示,质量标准',
  })
  editorVisible.value = true
}

function openEdit(type: KnowledgeType, item: KnowledgeItem) {
  editType.value = type
  editId.value = itemId(item)
  resetDraft()
  Object.assign(draft, item, {
    keywords: item.keywords.join(','),
    relatedDocumentIds: item.relatedDocumentIds.join(','),
  })
  editorVisible.value = true
}

function openDetail(item: KnowledgeItem) {
  selectedItem.value = item
  detailVisible.value = true
}

async function saveDraft() {
  const payload = {
    ...draft,
    keywords: draft.keywords?.split(/[,，]/).map((item) => item.trim()).filter(Boolean) ?? [],
    relatedDocumentIds: draft.relatedDocumentIds?.split(/[,，]/).map((item) => item.trim()).filter(Boolean) ?? [],
  }
  if (editId.value) await knowledge.updateRecord(editType.value, editId.value, payload)
  else await knowledge.createRecord(editType.value, payload)
  editorVisible.value = false
}

async function updateStatus(type: KnowledgeType, id: string, status: string) {
  await knowledge.updateStatus(type, id, status, 'V2.4 现场知识维护')
}

async function runBulk(patch: KnowledgeBulkUpdatePayload['patch'], reason: string) {
  if (!canUpdate(currentType.value) || selectedCount.value === 0) return
  const ok = window.confirm(`确认批量维护 ${selectedCount.value} 条知识记录？该操作不会删除数据。`)
  if (!ok) return
  const payload = { ids: [...knowledge.selectedKnowledgeRows], patch, reason }
  if (currentType.value === 'fixture') await knowledge.bulkUpdateFixtures(payload)
  if (currentType.value === 'abnormal_case') await knowledge.bulkUpdateAbnormalCases(payload)
  if (currentType.value === 'quality_standard') await knowledge.bulkUpdateQualityStandards(payload)
}

function selectVisible(rows: KnowledgeItem[]) {
  knowledge.selectedKnowledgeRows = rows.map(itemId)
}

async function reload() {
  await knowledge.loadAll()
}

onMounted(() => {
  void reload()
})
</script>

<template>
  <section class="grid gap-4">
    <div class="maintenance-hero system-hero-panel">
      <BookOpenCheck :size="38" />
      <div>
        <p class="section-kicker">V2.4 / FIELD KNOWLEDGE MAINTENANCE</p>
        <h3>治具库 / 异常库 / 质量标准库</h3>
        <p>仅维护本地 Mock metadata、knowledge-records 和 audit-logs，不连接 Sealos，不上传真实客户资料。</p>
      </div>
      <PrimeButton severity="secondary" label="刷新" :loading="knowledge.loading" @click="reload">
        <template #icon><RefreshCw :size="16" /></template>
      </PrimeButton>
    </div>

    <WarmPermissionDenied
      v-if="!canView"
      title="当前角色不能访问现场知识库"
      description="请切换到组长、资料维护、工艺、品质或管理员演示角色。"
    />

    <template v-else>
      <div class="maintenance-search-strip">
        <PrimeInputText v-model="knowledge.keyword" placeholder="搜索治具、异常、质量标准、产品编号、工位、关键词" @keydown.enter="reload" />
        <PrimeButton label="搜索" :loading="knowledge.loading" @click="reload" />
      </div>

      <PrimeTabs v-model:value="activeTab" @update:value="knowledge.clearSelectedKnowledgeRows">
        <PrimeTabList class="maintenance-tab-list">
          <PrimeTab v-for="tab in tabs" :key="tab.value" :value="tab.value">{{ tab.label }}</PrimeTab>
        </PrimeTabList>
        <PrimeTabPanels>
          <PrimeTabPanel value="fixtures">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap gap-2">
                <PrimeButton size="small" severity="secondary" label="全选当前" @click="selectVisible(knowledge.fixtures)" />
                <PrimeButton size="small" severity="secondary" label="清空选择" @click="knowledge.clearSelectedKnowledgeRows" />
                <PrimeButton size="small" label="标记有效" :disabled="!canUpdate('fixture') || !selectedCount" :loading="knowledge.bulkLoading" @click="runBulk({ status: 'active' }, 'V2.4 批量标记治具有效')" />
                <PrimeButton size="small" severity="warn" label="标记待复核" :disabled="!canUpdate('fixture') || !selectedCount" :loading="knowledge.bulkLoading" @click="runBulk({ status: 'pending_review' }, 'V2.4 批量标记治具待复核')" />
                <PrimeButton size="small" severity="danger" label="标记异常" :disabled="!canUpdate('fixture') || !selectedCount" :loading="knowledge.bulkLoading" @click="runBulk({ status: 'abnormal' }, 'V2.4 批量标记治具异常')" />
                <PrimeButton size="small" severity="secondary" label="更新为前段" :disabled="!canUpdate('fixture') || !selectedCount" @click="runBulk({ processSegment: 'front' }, 'V2.4 批量更新治具工序')" />
                <PrimeButton size="small" severity="secondary" label="更新为后段" :disabled="!canUpdate('fixture') || !selectedCount" @click="runBulk({ processSegment: 'back' }, 'V2.4 批量更新治具工序')" />
              </div>
              <PrimeButton label="新增治具" :disabled="!canCreate('fixture')" @click="openCreate('fixture')">
                <template #icon><Plus :size="16" /></template>
              </PrimeButton>
            </div>
            <PrimeDataTable :value="knowledge.fixtures" striped-rows scrollable scroll-height="420px">
              <PrimeColumn header="选择"><template #body="{ data }"><input type="checkbox" :checked="isSelected(data.fixtureId)" @change="knowledge.toggleSelectedKnowledgeRow(data.fixtureId)"></template></PrimeColumn>
              <PrimeColumn field="fixtureCode" header="治具编号" />
              <PrimeColumn field="fixtureName" header="治具名称" />
              <PrimeColumn field="productCode" header="产品" />
              <PrimeColumn field="applicableStation" header="工位" />
              <PrimeColumn field="status" header="状态" />
              <PrimeColumn header="操作">
                <template #body="{ data }">
                  <div class="flex flex-wrap gap-2">
                    <PrimeButton size="small" severity="secondary" label="详情" @click="openDetail(data)" />
                    <PrimeButton size="small" label="维护" :disabled="!canUpdate('fixture')" @click="openEdit('fixture', data)" />
                    <PrimeButton size="small" severity="warn" label="待复核" :disabled="!canUpdate('fixture')" @click="updateStatus('fixture', data.fixtureId, 'pending_review')" />
                    <PrimeButton size="small" severity="success" label="启用" :disabled="!canUpdate('fixture')" @click="updateStatus('fixture', data.fixtureId, 'active')" />
                  </div>
                </template>
              </PrimeColumn>
            </PrimeDataTable>
          </PrimeTabPanel>

          <PrimeTabPanel value="abnormal">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap gap-2">
                <PrimeButton size="small" severity="secondary" label="全选当前" @click="selectVisible(knowledge.abnormalCases)" />
                <PrimeButton size="small" severity="secondary" label="清空选择" @click="knowledge.clearSelectedKnowledgeRows" />
                <PrimeButton size="small" label="标记有效" :disabled="!canUpdate('abnormal_case') || !selectedCount" @click="runBulk({ status: 'active' }, 'V2.4 批量标记异常有效')" />
                <PrimeButton size="small" severity="warn" label="待复核" :disabled="!canUpdate('abnormal_case') || !selectedCount" @click="runBulk({ status: 'pending_review' }, 'V2.4 批量标记异常待复核')" />
                <PrimeButton size="small" severity="success" label="关闭" :disabled="!canUpdate('abnormal_case') || !selectedCount" @click="runBulk({ status: 'closed' }, 'V2.4 批量关闭异常')" />
                <PrimeButton size="small" severity="danger" label="严重度 high" :disabled="!canUpdate('abnormal_case') || !selectedCount" @click="runBulk({ severity: 'high' }, 'V2.4 批量更新异常严重度')" />
              </div>
              <PrimeButton label="新增异常" :disabled="!canCreate('abnormal_case')" @click="openCreate('abnormal_case')">
                <template #icon><Plus :size="16" /></template>
              </PrimeButton>
            </div>
            <PrimeDataTable :value="knowledge.abnormalCases" striped-rows scrollable scroll-height="420px">
              <PrimeColumn header="选择"><template #body="{ data }"><input type="checkbox" :checked="isSelected(data.abnormalId)" @change="knowledge.toggleSelectedKnowledgeRow(data.abnormalId)"></template></PrimeColumn>
              <PrimeColumn field="abnormalCode" header="异常编号" />
              <PrimeColumn field="title" header="异常标题" />
              <PrimeColumn field="productCode" header="产品" />
              <PrimeColumn field="station" header="工位" />
              <PrimeColumn field="severity" header="严重度" />
              <PrimeColumn field="status" header="状态" />
              <PrimeColumn header="操作">
                <template #body="{ data }">
                  <div class="flex flex-wrap gap-2">
                    <PrimeButton size="small" severity="secondary" label="详情" @click="openDetail(data)" />
                    <PrimeButton size="small" label="维护" :disabled="!canUpdate('abnormal_case')" @click="openEdit('abnormal_case', data)" />
                    <PrimeButton size="small" severity="success" label="关闭" :disabled="!canUpdate('abnormal_case')" @click="updateStatus('abnormal_case', data.abnormalId, 'closed')" />
                  </div>
                </template>
              </PrimeColumn>
            </PrimeDataTable>
          </PrimeTabPanel>

          <PrimeTabPanel value="quality">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap gap-2">
                <PrimeButton size="small" severity="secondary" label="全选当前" @click="selectVisible(knowledge.qualityStandards)" />
                <PrimeButton size="small" severity="secondary" label="清空选择" @click="knowledge.clearSelectedKnowledgeRows" />
                <PrimeButton size="small" label="当前有效" :disabled="!canUpdate('quality_standard') || !selectedCount" @click="runBulk({ status: 'effective' }, 'V2.4 批量标记质量标准有效')" />
                <PrimeButton size="small" severity="warn" label="待确认" :disabled="!canUpdate('quality_standard') || !selectedCount" @click="runBulk({ status: 'pending_review' }, 'V2.4 批量标记质量标准待确认')" />
                <PrimeButton size="small" severity="danger" label="已失效" :disabled="!canUpdate('quality_standard') || !selectedCount" @click="runBulk({ status: 'expired' }, 'V2.4 批量标记质量标准失效')" />
                <PrimeButton size="small" severity="danger" label="缺陷 critical" :disabled="!canUpdate('quality_standard') || !selectedCount" @click="runBulk({ defectLevel: 'critical' }, 'V2.4 批量更新缺陷等级')" />
              </div>
              <PrimeButton label="新增质量标准" :disabled="!canCreate('quality_standard')" @click="openCreate('quality_standard')">
                <template #icon><Plus :size="16" /></template>
              </PrimeButton>
            </div>
            <PrimeDataTable :value="knowledge.qualityStandards" striped-rows scrollable scroll-height="420px">
              <PrimeColumn header="选择"><template #body="{ data }"><input type="checkbox" :checked="isSelected(data.qualityId)" @change="knowledge.toggleSelectedKnowledgeRow(data.qualityId)"></template></PrimeColumn>
              <PrimeColumn field="qualityCode" header="标准编号" />
              <PrimeColumn field="title" header="标题" />
              <PrimeColumn field="productCode" header="产品" />
              <PrimeColumn field="inspectionItem" header="检验项目" />
              <PrimeColumn field="defectLevel" header="缺陷等级" />
              <PrimeColumn field="status" header="状态" />
              <PrimeColumn header="操作">
                <template #body="{ data }">
                  <div class="flex flex-wrap gap-2">
                    <PrimeButton size="small" severity="secondary" label="详情" @click="openDetail(data)" />
                    <PrimeButton size="small" label="维护" :disabled="!canUpdate('quality_standard')" @click="openEdit('quality_standard', data)" />
                    <PrimeButton size="small" severity="success" label="设为有效" :disabled="!canUpdate('quality_standard')" @click="updateStatus('quality_standard', data.qualityId, 'effective')" />
                  </div>
                </template>
              </PrimeColumn>
            </PrimeDataTable>
          </PrimeTabPanel>

          <PrimeTabPanel value="history">
            <PrimeDataTable :value="knowledge.history" striped-rows scrollable scroll-height="420px">
              <PrimeColumn header="时间"><template #body="{ data }">{{ dayjs(data.createdAt).format('MM-DD HH:mm') }}</template></PrimeColumn>
              <PrimeColumn field="entityType" header="类型" />
              <PrimeColumn field="entityId" header="对象 ID" />
              <PrimeColumn field="action" header="动作" />
              <PrimeColumn field="operatorName" header="操作人" />
              <PrimeColumn field="reason" header="原因" />
            </PrimeDataTable>
          </PrimeTabPanel>
        </PrimeTabPanels>
      </PrimeTabs>
    </template>

    <PrimeDialog v-model:visible="editorVisible" modal header="知识库维护" class="maintenance-editor-dialog">
      <div class="maintenance-editor-grid">
        <label v-for="key in Object.keys(draft)" :key="key">
          <span>{{ key }}</span>
          <PrimeTextarea v-if="['usageMethod', 'checkStandard', 'symptom', 'cause', 'solution', 'prevention', 'inspectionMethod', 'samplingRule', 'remark'].includes(key)" v-model="draft[key]" rows="3" />
          <PrimeInputText v-else v-model="draft[key]" />
        </label>
      </div>
      <template #footer>
        <PrimeButton severity="secondary" label="取消" @click="editorVisible = false" />
        <PrimeButton label="保存知识库记录" :loading="knowledge.saving" @click="saveDraft" />
      </template>
    </PrimeDialog>

    <WarmKnowledgeDetailDialog v-model:visible="detailVisible" :item="selectedItem" />
  </section>
</template>
