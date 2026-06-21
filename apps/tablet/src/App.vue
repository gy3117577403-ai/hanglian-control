<template>
  <div class="tablet-app-root" :data-performance-tier="performanceTier">
    <RouterView />
  </div>
  <Toaster rich-colors position="top-right" />
</template>

<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import { useTabletPerformance } from '@/composables/use-tablet-performance'

const { performanceTier } = useTabletPerformance()
</script>
