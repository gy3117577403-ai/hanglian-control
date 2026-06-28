<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle, LockKeyhole, Trash2 } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { DrawingItem, DrawingModule } from '@/types/production'

const props = defineProps<{
  visible: boolean
  item: DrawingItem | null
  module: DrawingModule | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const store = useDocumentHubStore()
const deleteSecret = ref('')
const reason = ref('')
const localError = ref('')

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => {
    emit('update:visible', value)
    if (!value) resetForm()
  },
})

const documentId = computed(() => props.item?.documentId || props.item?.itemId || '')
const locked = computed(() => Boolean(store.deleteLockStatus?.locked))
const actionLoading = computed(() => (
  store.lifecycleActionLoading && store.lifecycleActionDocumentId === documentId.value
))
const lockedUntilLabel = computed(() => {
  const value = store.deleteLockStatus?.lockedUntil
  if (!value) return ''
  const time = new Date(value)
  return Number.isNaN(time.getTime()) ? '' : time.toLocaleString()
})
const canSubmit = computed(() => (
  Boolean(props.item && props.module)
  && deleteSecret.value.trim().length > 0
  && !locked.value
  && !actionLoading.value
  && !store.deleteLockLoading
))

function resetForm() {
  deleteSecret.value = ''
  reason.value = ''
  localError.value = ''
}

function formatFileSize(value?: number) {
  if (!value) return '-'
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`
  if (value >= 1024) return `${Math.round(value / 1024)} KB`
  return `${value} B`
}

async function submit() {
  localError.value = ''
  if (!props.item || !props.module) return
  if (locked.value) {
    localError.value = '删除操作已临时锁定，请稍后再试。'
    return
  }
  const trimmedPassword = deleteSecret.value.trim()
  if (!trimmedPassword) {
    localError.value = '请输入删除密码。'
    return
  }
  try {
    await store.trashDocument(props.item, {
      password: trimmedPassword,
      reason: reason.value.trim() || undefined,
      operatorId: 'local-tablet',
      operatorName: '本地平板',
    })
    resetForm()
    emit('update:visible', false)
  } catch (error) {
    deleteSecret.value = ''
    localError.value = store.lifecycleError || (error instanceof Error ? error.message : '网络连接失败，请检查网络。')
    void store.loadDeleteLockStatus().catch(() => undefined)
  }
}

watch(() => props.visible, (visible) => {
  if (!visible) {
    resetForm()
    return
  }
  deleteSecret.value = ''
  localError.value = ''
})
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    modal
    header="移入回收站"
    :style="{ width: '520px' }"
    :draggable="false"
  >
    <section class="trash-dialog-body">
      <div class="trash-hint">
        <Trash2 :size="24" />
        <div>
          <b>资料移入回收站后可恢复，文件本体不会立即删除。</b>
          <span>{{ item?.title || '未选择资料' }}</span>
        </div>
      </div>

      <dl class="info-list">
        <div>
          <dt>产品</dt>
          <dd>{{ store.productDrawingDetail?.product.productModel || '-' }}</dd>
        </div>
        <div>
          <dt>模块</dt>
          <dd>{{ module?.moduleName || '-' }}</dd>
        </div>
        <div>
          <dt>文件</dt>
          <dd>{{ item?.fileName || item?.title || '-' }}</dd>
        </div>
        <div>
          <dt>版本</dt>
          <dd>{{ item?.version || '-' }}</dd>
        </div>
        <div>
          <dt>大小</dt>
          <dd>{{ formatFileSize(item?.fileSize) }}</dd>
        </div>
      </dl>

      <div v-if="locked" class="lock-warning">
        <AlertTriangle :size="18" />
        <span>删除操作已临时锁定，请稍后再试。{{ lockedUntilLabel ? ` 锁定至 ${lockedUntilLabel}` : '' }}</span>
      </div>

      <label class="form-field">
        删除密码
        <PrimeInputText
          v-model="deleteSecret"
          type="password"
          autocomplete="new-password"
          placeholder="请输入删除密码"
          :disabled="locked || actionLoading"
          @keydown.enter="submit"
        />
      </label>

      <label class="form-field">
        删除原因
        <PrimeTextarea
          v-model="reason"
          rows="3"
          auto-resize
          maxlength="200"
          placeholder="可填写删除原因"
          :disabled="actionLoading"
        />
      </label>

      <p v-if="localError || store.lifecycleError" class="error-message">
        {{ localError || store.lifecycleError }}
      </p>
    </section>

    <template #footer>
      <PrimeButton label="取消" severity="secondary" text :disabled="actionLoading" @click="dialogVisible = false" />
      <PrimeButton
        severity="warning"
        :loading="actionLoading"
        :disabled="!canSubmit"
        @click="submit"
      >
        <LockKeyhole :size="17" />
        <span>移入回收站</span>
      </PrimeButton>
    </template>
  </PrimeDialog>
</template>

<style scoped>
.trash-dialog-body {
  display: grid;
  gap: 14px;
}

.trash-hint {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 14px;
  background: rgba(255, 247, 236, 0.7);
  color: #70421d;
}

.trash-hint b,
.trash-hint span {
  display: block;
}

.trash-hint span {
  margin-top: 4px;
  color: #8a5b32;
  font-size: 13px;
  font-weight: 850;
}

.info-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}

.info-list div {
  min-width: 0;
  padding: 9px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.56);
}

.info-list dt {
  color: #9b5125;
  font-size: 12px;
  font-weight: 950;
}

.info-list dd {
  overflow: hidden;
  margin: 4px 0 0;
  color: #3d2815;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.form-field {
  display: grid;
  gap: 6px;
  color: #5f351a;
  font-size: 13px;
  font-weight: 950;
}

.lock-warning,
.error-message {
  margin: 0;
  padding: 9px 11px;
  border-radius: 12px;
  font-weight: 900;
}

.lock-warning {
  display: flex;
  gap: 8px;
  align-items: center;
  border: 1px solid rgba(189, 83, 48, 0.18);
  background: rgba(255, 235, 220, 0.74);
  color: #9b3d32;
}

.error-message {
  background: rgba(255, 229, 224, 0.72);
  color: #a23e31;
}
</style>
