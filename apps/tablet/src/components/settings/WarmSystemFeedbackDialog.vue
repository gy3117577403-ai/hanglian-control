<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useAuthStore } from '@/stores/auth-store'
import { useSettingsStore } from '@/stores/settings-store'
import type { SystemFeedbackRecord } from '@/types/production'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()
const settings = useSettingsStore()
const auth = useAuthStore()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const form = reactive<Partial<SystemFeedbackRecord>>({
  feedbackType: 'ui_issue',
  title: '',
  description: '',
  severity: 'medium',
  currentPage: '/tablet',
  expectedResult: '',
  actualResult: '',
  screenshotRemark: '',
})

const typeOptions = [
  { label: '资料问题', value: 'document_issue' },
  { label: '预览问题', value: 'preview_issue' },
  { label: '权限问题', value: 'permission_issue' },
  { label: '网络问题', value: 'network_issue' },
  { label: 'UI 问题', value: 'ui_issue' },
  { label: '性能问题', value: 'performance_issue' },
  { label: '其他', value: 'other' },
]
const severityOptions = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
  { label: '关键', value: 'critical' },
]

async function submit() {
  await settings.submitFeedback({
    ...form,
    role: auth.role ?? undefined,
    userId: auth.currentUser?.userId,
    userName: auth.userName,
  })
  dialogVisible.value = false
  form.title = ''
  form.description = ''
  form.expectedResult = ''
  form.actualResult = ''
  form.screenshotRemark = ''
}

watch(dialogVisible, (visible) => {
  if (visible) void settings.loadDictionaries()
})
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="提交使用反馈" class="w-[760px]">
    <div class="grid gap-4">
      <PrimeMessage severity="info" :closable="false">
        使用反馈用于记录软件试运行问题，不等同于生产异常反馈；生产异常仍走原有异常流程。
      </PrimeMessage>
      <div class="grid grid-cols-2 gap-3">
        <label class="grid gap-1 text-sm font-black text-[#76512a]">
          反馈类型
          <PrimeSelect v-model="form.feedbackType" :options="typeOptions" option-label="label" option-value="value" />
        </label>
        <label class="grid gap-1 text-sm font-black text-[#76512a]">
          严重程度
          <PrimeSelect v-model="form.severity" :options="severityOptions" option-label="label" option-value="value" />
        </label>
      </div>
      <label class="grid gap-1 text-sm font-black text-[#76512a]">
        标题
        <PrimeInputText v-model="form.title" placeholder="例如：平板横屏下按钮文字过长" />
      </label>
      <label class="grid gap-1 text-sm font-black text-[#76512a]">
        描述
        <PrimeTextarea v-model="form.description" rows="4" placeholder="请描述出现位置、操作步骤和影响范围" />
      </label>
      <div class="grid grid-cols-2 gap-3">
        <label class="grid gap-1 text-sm font-black text-[#76512a]">
          期望结果
          <PrimeTextarea v-model="form.expectedResult" rows="3" />
        </label>
        <label class="grid gap-1 text-sm font-black text-[#76512a]">
          实际结果
          <PrimeTextarea v-model="form.actualResult" rows="3" />
        </label>
      </div>
      <label class="grid gap-1 text-sm font-black text-[#76512a]">
        截图说明
        <PrimeInputText v-model="form.screenshotRemark" placeholder="仅文字描述，不上传截图" />
      </label>
      <div class="rounded-2xl bg-[#fff8ea] p-3 text-sm font-bold text-[#76512a]">
        当前角色：{{ auth.roleLabel }} / 当前用户：{{ auth.userName }}
      </div>
    </div>
    <template #footer>
      <PrimeButton severity="secondary" label="取消" @click="dialogVisible = false" />
      <PrimeButton label="提交反馈" :disabled="!form.title || !form.description || settings.saving" @click="submit" />
    </template>
  </PrimeDialog>
</template>
