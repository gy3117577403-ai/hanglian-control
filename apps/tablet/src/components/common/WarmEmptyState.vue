<script setup lang="ts">
import { ClipboardList } from 'lucide-vue-next'
import type { Component } from 'vue'

defineProps<{
  title: string
  description: string
  actionLabel?: string
  icon?: Component
}>()

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <section class="warm-state-card warm-empty-state">
    <component :is="icon ?? ClipboardList" :size="34" />
    <div class="min-w-0">
      <h4>{{ title }}</h4>
      <p>{{ description }}</p>
    </div>
    <PrimeButton
      v-if="actionLabel"
      severity="secondary"
      :label="actionLabel"
      @click="emit('action')"
    />
  </section>
</template>
