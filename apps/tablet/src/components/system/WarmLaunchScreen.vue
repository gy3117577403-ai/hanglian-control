<script setup lang="ts">
import { Factory, ShieldCheck } from 'lucide-vue-next'
import { APP_STAGE, APP_SYSTEM_NAME, APP_VERSION } from '@/config/app-version'

const emit = defineEmits<{
  skip: []
}>()
</script>

<template>
  <div class="warm-launch-screen">
    <section class="warm-launch-panel">
      <div class="warm-logo-mark warm-launch-mark">
        <Factory :size="42" stroke-width="2.4" />
      </div>
      <p class="section-kicker">TABLET FIELD DEMO PACKAGE</p>
      <h2>{{ APP_SYSTEM_NAME }}</h2>
      <strong>{{ APP_VERSION }} {{ APP_STAGE }}</strong>
      <div class="warm-launch-tags">
        <span>Mock 数据源</span>
        <span>未接 Sealos</span>
        <span>未接微盘</span>
        <span>未接真实语音</span>
      </div>
      <p class="warm-launch-loading">
        <ShieldCheck :size="18" />
        正在加载生产计划资料管控台
      </p>
      <PrimeButton severity="secondary" label="跳过" @click="emit('skip')" />
    </section>
  </div>
</template>
