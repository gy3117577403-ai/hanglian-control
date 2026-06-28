<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle, Flame, LockKeyhole } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { DrawingTrashItem } from '@/types/document-lifecycle'

const confirmTextValue = '确认彻底删除'

const props = defineProps<{
  visible: boolean
  item: DrawingTrashItem | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const store = useDocumentHubStore()
const deleteSecret = ref('')
const confirmText = ref('')
const reason = ref('')
const localError = ref('')

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => {
    emit('update:visible', value)
    if (!value) resetForm()
  },
})

const locked = computed(() => Boolean(store.deleteLockStatus?.locked))
const actionLoading = computed(() => (
  store.lifecycleActionLoading && store.lifecycleActionDocumentId === props.item?.documentId
))
const lockedUntilLabel = computed(() => {
  const value = store.deleteLockStatus?.lockedUntil
  if (!value) return ''
  const time = new Date(value)
  return Number.isNaN(time.getTime()) ? '' : time.toLocaleString()
})
const canSubmit = computed(() => (
  Boolean(props.item)
  && deleteSecret.value.trim().length > 0
  && confirmText.value === confirmTextValue
  && !locked.value
  && !actionLoading.value
  && !store.deleteLockLoading
))

function resetForm() {
  deleteSecret.value = ''
  confirmText.value = ''
  reason.value = ''
  localError.value = ''
}

function formatFileSize(value?: number) {
  if (!value) return '-'
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`
  if (value >= 1024) return `${Math.round(value / 1024)} KB`
  return `${value} B`
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

async function submit() {
  localError.value = ''
  if (!props.item) return
  if (locked.value) {
    localError.value = '删除操作已临时锁定，请稍后再试。'
    return
  }
  const trimmedPassword = deleteSecret.value.trim()
  if (!trimmedPassword) {
    localError.value = '请输入删除密码。'
    return
  }
  if (confirmText.value !== confirmTextValue) {
    localError.value = '请输入确认文字：确认彻底删除'
    return
  }
  try {
    await store.purgeDocument(props.item, {
      password: trimmedPassword,
      confirmText: confirmText.value,
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
    header="彻底删除资料"
    :style="{ width: '560px' }"
    :draggable="false"
  >
    <section class="purge-body">
      <div class="danger-hint">
        <Flame :size="26" />
        <div>
          <b>彻底删除后无法恢复。若资料包含本地上传文件，文件本体也会被删除。</b>
          <span>{{ item?.title || '未选择资料' }}</span>
        </div>
      </div>

      <dl class="info-list">
        <div>
          <dt>产品</dt>
          <dd>{{ item?.productModel || '-' }}</dd>
        </div>
        <div>
          <dt>模块</dt>
          <dd>{{ item?.moduleName || item?.moduleKey || '-' }}</dd>
        </div>
        <div>
          <dt>文件</dt>
          <dd>{{ item?.originalFileName || item?.title || '-' }}</dd>
        </div>
        <div>
          <dt>文件大小</dt>
          <dd>{{ formatFileSize(item?.fileSize) }}</dd>
        </div>
        <div>
          <dt>删除时间</dt>
          <dd>{{ formatDate(item?.deletedAt) }}</dd>
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
        确认文字
        <PrimeInputText
          v-model="confirmText"
          autocomplete="off"
          placeholder="请输入：确认彻底删除"
          :disabled="actionLoading"
          @keydown.enter="submit"
        />
      </label>

      <label class="form-field">
        彻底删除原因
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
        severity="danger"
        :loading="actionLoading"
        :disabled="!canSubmit"
        @click="submit"
      >
        <LockKeyhole :size="17" />
        <span>彻底删除</span>
      </PrimeButton>
    </template>
  </PrimeDialog>
</template>

<style scoped>
.purge-body {
  display: grid;
  gap: 14px;
}

.danger-hint {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(178, 59, 44, 0.24);
  border-radius: 14px;
  background: rgba(255, 233, 226, 0.78);
  color: #8b3328;
}

.danger-hint b,
.danger-hint span {
  display: block;
}

.danger-hint span {
  margin-top: 4px;
  color: #6f3a25;
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
  background: rgba(255, 255, 255, 0.58);
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
