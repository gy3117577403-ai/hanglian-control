<script setup lang="ts">
import WarmConnectorParameterView from '@/components/connector/WarmConnectorParameterView.vue'
import WarmDrawingLibraryView from '@/components/drawing/WarmDrawingLibraryView.vue'
import WarmFixtureParameterView from '@/components/fixture/WarmFixtureParameterView.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
</script>

<template>
  <section class="hub-content">
    <WarmDrawingLibraryView v-if="store.activeMode === 'drawing'" />
    <WarmConnectorParameterView v-else-if="store.activeMode === 'connector'" />
    <WarmFixtureParameterView v-else />
  </section>
</template>

<style scoped>
.hub-content {
  position: relative;
  isolation: isolate;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 26px;
  background:
    linear-gradient(115deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.1) 32%, transparent 58%),
    linear-gradient(292deg, rgba(93, 151, 145, 0.2), rgba(93, 151, 145, 0.05) 48%, transparent 66%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.16), rgba(255, 241, 220, 0.025)),
    rgba(255, 255, 255, 0.045);
  box-shadow:
    0 54px 104px rgba(75, 38, 13, 0.18),
    0 12px 32px rgba(255, 255, 255, 0.18) inset,
    0 0 0 1px rgba(119, 77, 38, 0.045),
    0 0 100px rgba(255, 255, 255, 0.32),
    0 2px 0 rgba(255, 255, 255, 0.96) inset,
    30px 0 64px rgba(255, 255, 255, 0.28) inset,
    -30px -20px 70px rgba(105, 151, 145, 0.12) inset,
    inset 0 -34px 72px rgba(132, 70, 30, 0.025);
  backdrop-filter: blur(18px) saturate(1.18);
  -webkit-backdrop-filter: blur(18px) saturate(1.18);
  transform: translateZ(0);
}

.hub-content::before,
.hub-content::after {
  position: absolute;
  content: '';
  pointer-events: none;
}

.hub-content::before {
  inset: 1px;
  z-index: -1;
  border-radius: 25px;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.12) 24%, transparent 52%),
    linear-gradient(300deg, rgba(117, 158, 150, 0.18), transparent 46%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.12), transparent 12%, transparent 88%, rgba(92, 57, 28, 0.06));
}

.hub-content::after {
  right: 14px;
  bottom: 8px;
  left: 14px;
  height: 28px;
  border-radius: 999px;
  background: rgba(72, 39, 18, 0.18);
  filter: blur(22px);
  transform: translateY(14px);
}

@media (max-width: 1320px), (prefers-reduced-motion: reduce) {
  .hub-content {
    backdrop-filter: blur(14px) saturate(1.12);
    -webkit-backdrop-filter: blur(14px) saturate(1.12);
  }
}
</style>
