<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import gsap from 'gsap'
import WarmDialogs from '@/components/warm/WarmDialogs.vue'
import WarmDocumentWorkspace from '@/components/warm/WarmDocumentWorkspace.vue'
import WarmPlanRail from '@/components/warm/WarmPlanRail.vue'
import WarmProcessBoard from '@/components/warm/WarmProcessBoard.vue'
import WarmProductHeader from '@/components/warm/WarmProductHeader.vue'
import WarmStatusBar from '@/components/warm/WarmStatusBar.vue'
import { useProductionStore } from '@/stores/production-store'

const store = useProductionStore()
const shellRef = ref<HTMLElement | null>(null)
let ctx: gsap.Context | undefined

const dialogs = reactive({
  feedback: false,
  upload: false,
  versions: false,
  audit: false,
  migration: false,
})

function openFeedback() {
  dialogs.feedback = true
}

function openUpload() {
  dialogs.upload = true
}

async function openVersions() {
  const document = store.previewDocument ?? store.documents[0]
  if (document) {
    store.previewDocument = document
    await store.loadDocumentVersions(document.documentId ?? document.id).catch(() => undefined)
  }
  dialogs.versions = true
}

async function openAudit() {
  await store.loadAuditLogs({ planId: store.selectedPlan.id, limit: 30 }).catch(() => undefined)
  dialogs.audit = true
}

async function openMigration() {
  await store.loadMigrationPreview().catch(() => undefined)
  dialogs.migration = true
}

onMounted(() => {
  void store.initialize()
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
  <div ref="shellRef" class="warm-shell">
    <div class="warm-workbench">
      <WarmStatusBar />
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
            <WarmProcessBoard />
            <WarmDocumentWorkspace
              @open-upload="openUpload"
              @open-versions="dialogs.versions = true"
              @open-audit="dialogs.audit = true"
              @open-migration="dialogs.migration = true"
            />
          </div>
        </section>
      </main>
    </div>

    <PrimeToast position="top-right" />
    <PrimeConfirmDialog />
    <WarmDialogs
      v-model:feedback-open="dialogs.feedback"
      v-model:upload-open="dialogs.upload"
      v-model:versions-open="dialogs.versions"
      v-model:audit-open="dialogs.audit"
      v-model:migration-open="dialogs.migration"
    />
  </div>
</template>
