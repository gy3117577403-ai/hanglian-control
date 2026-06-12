<script setup lang="ts">
import { ref } from 'vue'
import { MessageSquareWarning, Send } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { feedbackTypes } from '@/mock/production-data'
import { useProductionStore } from '@/stores/production-store'
import type { FeedbackType } from '@/types/production'

const store = useProductionStore()
const open = ref(false)
const selectedType = ref<FeedbackType>('资料缺失')
const description = ref('')

function submit() {
  store.submitFeedback(selectedType.value, description.value || '现场发现资料异常，等待工艺复核。')
  description.value = ''
  selectedType.value = '资料缺失'
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button type="button" class="h-14 bg-red-500 px-8 text-lg text-white hover:bg-red-400">
        <MessageSquareWarning class="size-5" />
        异常反馈
      </Button>
    </DialogTrigger>
    <DialogContent class="border-red-400/30 bg-slate-950 text-slate-50 sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle class="text-2xl text-slate-50">提交异常反馈</DialogTitle>
        <DialogDescription class="text-slate-400">
          当前仅写入本地 Mock 异常记录，不会连接真实工单、语音平台或企业微信。
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4">
        <div>
          <label class="text-sm font-semibold text-slate-300">异常类型</label>
          <select
            v-model="selectedType"
            class="mt-2 h-12 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-base text-slate-50 outline-none ring-cyan-300 focus:ring-2"
          >
            <option v-for="type in feedbackTypes" :key="type" :value="type">{{ type }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-semibold text-slate-300">异常说明</label>
          <Textarea
            v-model="description"
            class="mt-2 min-h-32 border-slate-700 bg-slate-900 text-base text-slate-50 placeholder:text-slate-500 focus-visible:ring-cyan-300"
            placeholder="例如：SOP 图片与现场夹具方向不一致，需要工艺复核。"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" class="h-12 bg-cyan-300 px-6 text-slate-950 hover:bg-cyan-200" @click="submit">
          <Send class="size-4" />
          提交反馈
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
