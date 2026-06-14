<script setup lang="ts">
import { ShieldX } from 'lucide-vue-next'

defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <section class="warm-permission-denied">
    <div class="warm-permission-icon">
      <ShieldX :size="24" />
    </div>
    <div>
      <h3>{{ title ?? '当前角色无权执行该操作' }}</h3>
      <p>{{ description ?? '请切换到具备权限的 Mock 角色，或联系管理员角色演示权限矩阵。' }}</p>
    </div>
  </section>
</template>
