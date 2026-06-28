<script setup lang="ts">
withDefaults(defineProps<{
  state?: 'loading' | 'error'
  label?: string
  error?: unknown
}>(), {
  state: 'loading',
  label: '正在加载功能模块...',
})

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="async-fallback" role="status" aria-live="polite">
    <span v-if="state === 'loading'" class="async-spinner" aria-hidden="true" />
    <div>
      <b>{{ state === 'error' ? '功能模块加载失败' : label }}</b>
      <p v-if="state === 'error'">请检查本地服务后重试。</p>
    </div>
    <PrimeButton
      v-if="state === 'error'"
      size="small"
      severity="secondary"
      outlined
      label="重试"
      @click="emit('retry')"
    />
  </div>
</template>

<style scoped>
.async-fallback {
  display: inline-grid;
  grid-auto-flow: column;
  grid-auto-columns: auto;
  gap: 10px;
  align-items: center;
  justify-content: center;
  min-width: min(100%, 220px);
  min-height: 72px;
  padding: 12px 14px;
  border: 1px solid rgba(139, 90, 42, 0.14);
  border-radius: 16px;
  background: rgba(255, 250, 242, 0.76);
  color: #75431f;
  font-weight: 900;
}

.async-fallback b,
.async-fallback p {
  margin: 0;
}

.async-fallback p {
  margin-top: 3px;
  color: #9a5a2c;
  font-size: 12px;
}

.async-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(151, 86, 35, 0.18);
  border-top-color: rgba(185, 97, 31, 0.82);
  border-radius: 999px;
  animation: async-spin 900ms linear infinite;
}

@keyframes async-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .async-spinner {
    animation: none;
  }
}
</style>
