<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { ShieldAlert } from 'lucide-vue-next'

export interface DeleteDialogAction {
  mode: 'delete' | 'purge' | 'bulk-delete' | 'bulk-purge'
  title: string
  count?: number
}

const props = defineProps<{
  visible: boolean
  action: DeleteDialogAction | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: { password: string; reason?: string; confirmText?: string }]
}>()

const form = reactive({
  password: '',
  reason: '',
  confirmText: '',
})

const confirmTextValue = '确认彻底删除'
const needsConfirmText = computed(() => props.action?.mode === 'purge' || props.action?.mode === 'bulk-purge')
const title = computed(() => props.action?.title ?? '删除资料')
const actionCopy = computed(() => {
  if (!props.action) return ''
  if (props.action.mode === 'delete') return '当前为本地定制版，默认删除密码为 123。后续可在设置中修改。移入回收站后仍可恢复，文件不会立即删除。'
  if (props.action.mode === 'bulk-delete') return `当前为本地定制版，默认删除密码为 123。将 ${props.action.count ?? 0} 条资料移入回收站，文件不会立即删除。`
  if (props.action.mode === 'bulk-purge') return `该操作将彻底删除 ${props.action.count ?? 0} 条资料记录；若存在本地上传文件，也会删除文件。请输入删除密码并输入确认文字。`
  return '该操作将彻底删除资料记录；若存在本地上传文件，也会删除文件。请输入删除密码并输入确认文字。'
})

const canSubmit = computed(() => {
  if (!form.password) return false
  if (needsConfirmText.value && form.confirmText !== confirmTextValue) return false
  return true
})

watch(() => props.visible, (next) => {
  if (!next) {
    form.password = ''
    form.reason = ''
    form.confirmText = ''
  }
})

function close() {
  emit('update:visible', false)
}

function submit() {
  if (!canSubmit.value) return
  emit('submit', {
    password: form.password,
    reason: form.reason,
    confirmText: form.confirmText,
  })
}
</script>

<template>
  <PrimeDialog :visible="visible" modal :header="title" :style="{ width: '560px' }" @update:visible="emit('update:visible', $event)">
    <div class="password-panel">
      <div class="warning-icon">
        <ShieldAlert :size="34" />
      </div>
      <div>
        <h3>需要删除密码</h3>
        <p>{{ actionCopy }}</p>
      </div>
    </div>

    <label>
      删除密码
      <PrimeInputText v-model="form.password" type="password" autocomplete="off" placeholder="请输入删除密码以继续" />
    </label>
    <label>
      操作原因
      <PrimeTextarea v-model="form.reason" rows="3" auto-resize placeholder="可填写删除原因" />
    </label>
    <label v-if="needsConfirmText">
      二次确认
      <PrimeInputText v-model="form.confirmText" autocomplete="off" placeholder="请输入：确认彻底删除" />
      <small>彻底删除会删除 metadata 记录；本地上传文件仅允许删除 uploads 白名单目录内文件。</small>
    </label>

    <template #footer>
      <PrimeButton label="取消" severity="secondary" text @click="close" />
      <PrimeButton :label="needsConfirmText ? '确认彻底删除' : '确认删除'" severity="danger" :disabled="!canSubmit" @click="submit" />
    </template>
  </PrimeDialog>
</template>

<style scoped>
.password-panel {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid rgba(178, 69, 39, 0.24);
  border-radius: 14px;
  background: rgba(255, 232, 209, 0.78);
}

.warning-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(145deg, #d2662f, #9d331f);
  color: #fff8ed;
}

h3,
p {
  margin: 0;
}

h3 {
  color: #8f321d;
  font-size: 19px;
  font-weight: 950;
}

p,
small {
  color: #76512a;
  font-weight: 850;
}

label {
  display: grid;
  gap: 7px;
  margin-bottom: 12px;
  color: #5f351a;
  font-weight: 950;
}
</style>
