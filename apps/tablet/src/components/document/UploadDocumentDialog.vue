<script setup lang="ts">
import { computed, ref } from 'vue'
import { UploadCloud } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useProductionStore } from '@/stores/production-store'
import type { DocumentStatus, DocumentTypeV03, RequiredProcess } from '@/types/production'

const store = useProductionStore()

const documentTypeOptions: Array<{ value: DocumentTypeV03; label: string }> = [
  { value: 'drawing_pdf', label: 'PDF 图纸' },
  { value: 'sop_image', label: 'SOP 扫描图片' },
  { value: 'connector_manual', label: '连接器装配说明书' },
  { value: 'pinout_diagram', label: '插接孔位图' },
  { value: 'finished_detail_image', label: '成品细节图' },
  { value: 'process_card', label: '作业流程卡' },
]

const statusOptions: Array<{ value: DocumentStatus; label: string }> = [
  { value: 'effective', label: '有效' },
  { value: 'pending_review', label: '待确认' },
  { value: 'expired', label: '失效' },
  { value: 'inconsistent', label: '不一致' },
]

const processOptions: Array<{ value: RequiredProcess; label: string }> = [
  { value: 'front', label: '前段必需' },
  { value: 'back', label: '后段必需' },
  { value: 'common', label: '通用资料' },
]

const open = computed({
  get: () => store.uploadDialogOpen,
  set: (value: boolean) => {
    store.uploadDialogOpen = value
  },
})

const selectedFile = ref<File | null>(null)
const documentType = ref<DocumentTypeV03>('drawing_pdf')
const status = ref<DocumentStatus>('effective')
const requiredForProcess = ref<RequiredProcess>('common')
const title = ref('')
const version = ref('V1.0')
const keywords = ref('')
const remark = ref('')

function resetForm() {
  selectedFile.value = null
  documentType.value = 'drawing_pdf'
  status.value = 'effective'
  requiredForProcess.value = 'common'
  title.value = ''
  version.value = 'V1.0'
  keywords.value = ''
  remark.value = ''
}

function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  selectedFile.value = file
  if (file && !title.value) {
    title.value = file.name.replace(/\.[^.]+$/, '')
  }
}

async function submit() {
  if (!selectedFile.value) {
    toast.error('请选择要上传的 PDF 或图片资料')
    return
  }
  if (!title.value.trim()) {
    toast.error('请填写资料标题')
    return
  }

  const formData = new FormData()
  formData.set('file', selectedFile.value)
  formData.set('documentType', documentType.value)
  formData.set('title', title.value.trim())
  formData.set('version', version.value.trim() || 'V1.0')
  formData.set('status', status.value)
  formData.set('requiredForProcess', requiredForProcess.value)
  formData.set('keywords', keywords.value.trim())
  formData.set('remark', remark.value.trim())

  await store.uploadCurrentDocument(formData)
  if (!store.uploadDialogOpen) resetForm()
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="border-cyan-300/30 bg-slate-950 text-slate-50 sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle class="text-2xl text-slate-50">上传本地资料并绑定产品</DialogTitle>
        <DialogDescription class="text-slate-400">
          当前文件只保存到后端本地 storage/uploads，用于 V0.5 原型验证，不会连接企业微信微盘或对象存储。
        </DialogDescription>
      </DialogHeader>

      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2">
          <label class="text-sm font-semibold text-slate-300">资料文件</label>
          <input
            class="mt-2 flex h-12 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 file:mr-4 file:rounded-md file:border-0 file:bg-cyan-300 file:px-4 file:py-2 file:font-semibold file:text-slate-950"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            @change="onFileChange"
          >
          <p class="mt-2 text-xs text-slate-500">允许 PDF、JPG、PNG、WEBP，单文件最大 30MB。</p>
        </div>

        <div>
          <label class="text-sm font-semibold text-slate-300">资料类型</label>
          <select
            v-model="documentType"
            class="mt-2 h-12 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-base text-slate-50 outline-none ring-cyan-300 focus:ring-2"
          >
            <option v-for="item in documentTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </div>

        <div>
          <label class="text-sm font-semibold text-slate-300">适用工序</label>
          <select
            v-model="requiredForProcess"
            class="mt-2 h-12 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-base text-slate-50 outline-none ring-cyan-300 focus:ring-2"
          >
            <option v-for="item in processOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </div>

        <div>
          <label class="text-sm font-semibold text-slate-300">资料标题</label>
          <Input
            v-model="title"
            class="mt-2 h-12 border-slate-700 bg-slate-900 text-base text-slate-50 placeholder:text-slate-500 focus-visible:ring-cyan-300"
            placeholder="例如：后段孔位图-A版"
          />
        </div>

        <div>
          <label class="text-sm font-semibold text-slate-300">版本号</label>
          <Input
            v-model="version"
            class="mt-2 h-12 border-slate-700 bg-slate-900 text-base text-slate-50 placeholder:text-slate-500 focus-visible:ring-cyan-300"
            placeholder="V1.0"
          />
        </div>

        <div>
          <label class="text-sm font-semibold text-slate-300">资料状态</label>
          <select
            v-model="status"
            class="mt-2 h-12 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-base text-slate-50 outline-none ring-cyan-300 focus:ring-2"
          >
            <option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </div>

        <div>
          <label class="text-sm font-semibold text-slate-300">搜索关键词</label>
          <Input
            v-model="keywords"
            class="mt-2 h-12 border-slate-700 bg-slate-900 text-base text-slate-50 placeholder:text-slate-500 focus-visible:ring-cyan-300"
            placeholder="用逗号分隔，例如：孔位图,后段,连接器"
          />
        </div>

        <div class="col-span-2">
          <label class="text-sm font-semibold text-slate-300">备注</label>
          <Textarea
            v-model="remark"
            class="mt-2 min-h-24 border-slate-700 bg-slate-900 text-base text-slate-50 placeholder:text-slate-500 focus-visible:ring-cyan-300"
            placeholder="记录来源、现场说明或需要复核的地方"
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          class="h-12 bg-cyan-300 px-6 text-slate-950 hover:bg-cyan-200"
          :disabled="store.uploadLoading || !store.apiOnline"
          @click="submit"
        >
          <UploadCloud class="size-4" />
          {{ store.uploadLoading ? '上传中...' : '上传并绑定' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
