<script setup lang="ts">
import { onMounted } from 'vue'
import TabletStatusBar from '@/components/layout/TabletStatusBar.vue'
import PlanSidebar from '@/components/plan/PlanSidebar.vue'
import ProductWorkspace from '@/components/product/ProductWorkspace.vue'
import { Toaster } from '@/components/ui/sonner'
import { useProductionStore } from '@/stores/production-store'

const store = useProductionStore()

onMounted(() => {
  void store.initialize()
})
</script>

<template>
  <div class="min-h-screen overflow-hidden bg-slate-950 text-slate-50">
    <div class="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.15),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(16,185,129,0.13),transparent_28%),linear-gradient(135deg,rgba(15,23,42,1),rgba(2,6,23,1))]" />
    <div class="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:36px_36px]" />
    <div class="relative flex h-screen min-h-[768px] flex-col">
      <TabletStatusBar />
      <div class="grid min-h-0 flex-1 grid-cols-[minmax(380px,0.34fr)_minmax(720px,0.66fr)] gap-4 p-4">
        <PlanSidebar />
        <ProductWorkspace />
      </div>
    </div>
    <Toaster position="top-right" rich-colors />
  </div>
</template>
