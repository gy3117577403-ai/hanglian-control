<template>
  <div class="tablet-app-root" :data-performance-tier="performanceTier">
    <RouterView />
  </div>
  <WarmNativeNetworkBanner />
  <Toaster rich-colors position="top-right" />
</template>

<script setup lang="ts">
import WarmNativeNetworkBanner from '@/components/native/WarmNativeNetworkBanner.vue'
import { Toaster } from '@/components/ui/sonner'
import { useNativeAppViewport } from '@/composables/use-native-app-viewport'
import { useTabletPerformance } from '@/composables/use-tablet-performance'

const { performanceTier } = useTabletPerformance()
useNativeAppViewport(performanceTier)
</script>
