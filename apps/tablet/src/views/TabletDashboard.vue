<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import gsap from 'gsap'
import { toast } from 'vue-sonner'
import WarmAnalyticsDashboardDialog from '@/components/analytics/WarmAnalyticsDashboardDialog.vue'
import WarmAnnouncementDialog from '@/components/settings/WarmAnnouncementDialog.vue'
import WarmImportCenterDialog from '@/components/imports/WarmImportCenterDialog.vue'
import WarmExecutionPanel from '@/components/execution/WarmExecutionPanel.vue'
import WarmKnowledgePanel from '@/components/knowledge/WarmKnowledgePanel.vue'
import WarmMaintenanceCenterDialog from '@/components/maintenance/WarmMaintenanceCenterDialog.vue'
import WarmFieldWorkflow from '@/components/field/WarmFieldWorkflow.vue'
import WarmQuickActions from '@/components/field/WarmQuickActions.vue'
import WarmDialogs from '@/components/warm/WarmDialogs.vue'
import WarmDocumentWorkspace from '@/components/warm/WarmDocumentWorkspace.vue'
import WarmFieldQaChecklist from '@/components/field/WarmFieldQaChecklist.vue'
import WarmDemoAssetsGuideDialog from '@/components/system/WarmDemoAssetsGuideDialog.vue'
import WarmDemoDataManagerDialog from '@/components/system/WarmDemoDataManagerDialog.vue'
import WarmDemoGuideDialog from '@/components/system/WarmDemoGuideDialog.vue'
import WarmDemoReadinessDialog from '@/components/system/WarmDemoReadinessDialog.vue'
import WarmFreezeChecklistDialog from '@/components/system/WarmFreezeChecklistDialog.vue'
import WarmNetworkDiagnosticsDialog from '@/components/system/WarmNetworkDiagnosticsDialog.vue'
import WarmLandscapeGuard from '@/components/system/WarmLandscapeGuard.vue'
import WarmLaunchScreen from '@/components/system/WarmLaunchScreen.vue'
import WarmPwaDiagnosticsDialog from '@/components/system/WarmPwaDiagnosticsDialog.vue'
import WarmPwaInstallPrompt from '@/components/system/WarmPwaInstallPrompt.vue'
import WarmRoadmapDialog from '@/components/system/WarmRoadmapDialog.vue'
import WarmSettingsCenterDialog from '@/components/settings/WarmSettingsCenterDialog.vue'
import WarmSystemFeedbackDialog from '@/components/settings/WarmSystemFeedbackDialog.vue'
import WarmSystemInfoDialog from '@/components/system/WarmSystemInfoDialog.vue'
import WarmPilotCheckDialog from '@/components/settings/WarmPilotCheckDialog.vue'
import WarmSystemQaDialog from '@/components/systemqa/WarmSystemQaDialog.vue'
import WarmPlanRail from '@/components/warm/WarmPlanRail.vue'
import WarmProcessBoard from '@/components/warm/WarmProcessBoard.vue'
import WarmProductHeader from '@/components/warm/WarmProductHeader.vue'
import { PERMISSIONS } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth-store'
import { useKnowledgeStore } from '@/stores/knowledge-store'
import { useProductionStore } from '@/stores/production-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useUiStore } from '@/stores/ui-store'

const auth = useAuthStore()
const knowledgeStore = useKnowledgeStore()
const store = useProductionStore()
const settingsStore = useSettingsStore()
const uiStore = useUiStore()
const shellRef = ref<HTMLElement | null>(null)
const documentAnchorRef = ref<HTMLElement | null>(null)
const knowledgeAnchorRef = ref<HTMLElement | null>(null)
const launchVisible = ref(true)
let ctx: gsap.Context | undefined

const shellClasses = computed(() => [
  'warm-shell',
  {
    'field-mode': uiStore.fieldMode || settingsStore.displaySettings?.defaultFieldMode,
    'settings-font-large': settingsStore.displaySettings?.fontScale === 'large',
    'settings-font-extra-large': settingsStore.displaySettings?.fontScale === 'extra_large',
    'settings-density-comfortable': settingsStore.displaySettings?.cardDensity === 'comfortable',
  },
])

const dialogs = reactive({
  feedback: false,
  upload: false,
  versions: false,
  audit: false,
  migration: false,
  network: false,
  pwaInstall: false,
  pwaDiagnostics: false,
  importCenter: false,
  maintenanceCenter: false,
  fieldQa: false,
  systemInfo: false,
  demoGuide: false,
  demoDataManager: false,
  demoReadiness: false,
  freezeChecklist: false,
  demoAssetsGuide: false,
  roadmap: false,
  analytics: false,
  systemQa: false,
  settingsCenter: false,
  systemFeedback: false,
  pilotCheck: false,
  announcements: false,
})

function openFeedback() {
  if (!auth.hasPermission(PERMISSIONS.PLAN_FEEDBACK)) return deny()
  dialogs.feedback = true
}

function openUpload() {
  if (!auth.hasPermission(PERMISSIONS.DOCUMENT_UPLOAD)) return deny()
  dialogs.upload = true
}

async function openVersions() {
  if (!auth.hasPermission(PERMISSIONS.DOCUMENT_VIEW)) return deny()
  const document = store.previewDocument ?? store.documents[0]
  if (document) {
    store.previewDocument = document
    await store.loadDocumentVersions(document.documentId ?? document.id).catch(() => undefined)
  }
  dialogs.versions = true
}

async function openAudit() {
  if (!auth.hasPermission(PERMISSIONS.DOCUMENT_AUDIT_VIEW)) return deny()
  await store.loadAuditLogs({ planId: store.selectedPlan.id, limit: 30 }).catch(() => undefined)
  dialogs.audit = true
}

async function openMigration() {
  if (!auth.hasPermission(PERMISSIONS.SYSTEM_INFO_VIEW)) return deny()
  await store.loadMigrationPreview().catch(() => undefined)
  dialogs.migration = true
}

function deny() {
  toast.error('当前角色无权执行该操作。', {
    description: '请在右上角切换到具备权限的 Mock 角色。',
  })
}

function focusDocuments() {
  documentAnchorRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function openKnowledge(tab: 'validation' | 'fixtures' | 'abnormal' | 'quality') {
  knowledgeStore.activeTab = tab
  knowledgeAnchorRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function closeLaunchScreen() {
  launchVisible.value = false
}

async function refreshAfterImport() {
  await store.loadPlans(store.scope).catch(() => undefined)
}

async function refreshAfterMaintenance() {
  await store.loadPlans(store.scope).catch(() => undefined)
}

onMounted(() => {
  if (auth.role === 'front_leader') store.activeProcess = 'front'
  if (auth.role === 'back_leader') store.activeProcess = 'back'
  void store.initialize()
  void settingsStore.initialize()
  window.setTimeout(() => {
    launchVisible.value = false
  }, 1500)
  ctx = gsap.context(() => {
    gsap.from('.warm-enter', {
      y: 18,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
      stagger: 0.045,
    })
  }, shellRef.value ?? undefined)
})

onUnmounted(() => {
  ctx?.revert()
})
</script>

<template>
  <div ref="shellRef" :class="shellClasses">
    <div class="warm-workbench">
      <main class="warm-layout">
        <WarmPlanRail />
        <section class="warm-board">
          <WarmProductHeader
            @open-feedback="openFeedback"
            @open-upload="openUpload"
            @open-versions="openVersions"
            @open-audit="openAudit"
            @open-migration="openMigration"
          />
          <div class="warm-board-stack warm-scroll">
            <WarmFieldWorkflow />
            <WarmQuickActions
              @open-upload="openUpload"
              @open-feedback="openFeedback"
              @focus-documents="focusDocuments"
              @open-knowledge="openKnowledge"
            />
            <WarmExecutionPanel />
            <WarmProcessBoard />
            <div ref="documentAnchorRef">
              <WarmDocumentWorkspace
                @open-upload="openUpload"
                @open-versions="dialogs.versions = true"
                @open-audit="dialogs.audit = true"
                @open-migration="dialogs.migration = true"
              />
            </div>
            <div ref="knowledgeAnchorRef">
              <WarmKnowledgePanel />
            </div>
          </div>
        </section>
      </main>
    </div>

    <PrimeToast position="top-right" />
    <PrimeConfirmDialog />
    <WarmLandscapeGuard />
    <WarmLaunchScreen v-if="launchVisible" @skip="closeLaunchScreen" />
    <WarmDialogs
      v-model:feedback-open="dialogs.feedback"
      v-model:upload-open="dialogs.upload"
      v-model:versions-open="dialogs.versions"
      v-model:audit-open="dialogs.audit"
      v-model:migration-open="dialogs.migration"
    />
    <WarmNetworkDiagnosticsDialog v-model:visible="dialogs.network" />
    <WarmPwaInstallPrompt v-model:visible="dialogs.pwaInstall" />
    <WarmPwaDiagnosticsDialog
      v-model:visible="dialogs.pwaDiagnostics"
      @open-install="dialogs.pwaInstall = true"
      @open-network="dialogs.network = true"
    />
    <WarmImportCenterDialog
      v-model:visible="dialogs.importCenter"
      @imported="refreshAfterImport"
    />
    <WarmMaintenanceCenterDialog
      v-model:visible="dialogs.maintenanceCenter"
      @changed="refreshAfterMaintenance"
    />
    <WarmFieldQaChecklist v-model:visible="dialogs.fieldQa" />
    <WarmSystemInfoDialog v-model:visible="dialogs.systemInfo" @open-feedback="dialogs.systemFeedback = true" />
    <WarmDemoGuideDialog
      v-model:visible="dialogs.demoGuide"
      @open-network="dialogs.network = true"
      @open-field-qa="dialogs.fieldQa = true"
      @open-upload="openUpload"
    />
    <WarmDemoDataManagerDialog
      v-model:visible="dialogs.demoDataManager"
      @open-assets-guide="dialogs.demoAssetsGuide = true"
      @open-network="dialogs.network = true"
      @open-field-qa="dialogs.fieldQa = true"
    />
    <WarmDemoReadinessDialog
      v-model:visible="dialogs.demoReadiness"
      @open-network="dialogs.network = true"
      @open-system-info="dialogs.systemInfo = true"
    />
    <WarmFreezeChecklistDialog v-model:visible="dialogs.freezeChecklist" />
    <WarmDemoAssetsGuideDialog
      v-model:visible="dialogs.demoAssetsGuide"
      @open-upload="openUpload"
    />
    <WarmRoadmapDialog v-model:visible="dialogs.roadmap" />
    <WarmAnalyticsDashboardDialog v-model:visible="dialogs.analytics" />
    <WarmSystemQaDialog v-model:visible="dialogs.systemQa" />
    <WarmSettingsCenterDialog v-model:visible="dialogs.settingsCenter" />
    <WarmSystemFeedbackDialog v-model:visible="dialogs.systemFeedback" />
    <WarmPilotCheckDialog v-model:visible="dialogs.pilotCheck" />
    <WarmAnnouncementDialog v-model:visible="dialogs.announcements" />
  </div>
</template>
