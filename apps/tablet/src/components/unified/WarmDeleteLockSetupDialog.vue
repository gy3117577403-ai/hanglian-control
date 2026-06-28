<script setup lang="ts">
import { reactive, ref } from 'vue'
import { KeyRound } from 'lucide-vue-next'
import { useUnifiedDocumentStore } from '@/stores/unified-document-store'

const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ saved: [] }>()
const store = useUnifiedDocumentStore()
const submitting = ref(false)

const form = reactive({
  password: '',
  confirmPassword: '',
})

async function submit() {
  submitting.value = true
  try {
    await store.setupDeletePassword({ ...form })
    form.password = ''
    form.confirmPassword = ''
    emit('saved')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <PrimeDialog v-model:visible="visible" modal header="设置删除密码" :style="{ width: '520px' }">
    <div class="setup-head">
      <KeyRound :size="32" />
      <div>
        <h3>首次删除前需要设置密码</h3>
        <p>密码只在后端本地 metadata 中保存 bcrypt hash，不写死在代码里，也不返回前端。</p>
      </div>
    </div>
    <label>
      删除密码
      <PrimeInputText v-model="form.password" type="password" autocomplete="off" placeholder="至少 6 位" />
    </label>
    <label>
      确认密码
      <PrimeInputText v-model="form.confirmPassword" type="password" autocomplete="off" placeholder="再次输入删除密码" />
    </label>
    <template #footer>
      <PrimeButton label="取消" severity="secondary" text @click="visible = false" />
      <PrimeButton label="保存删除密码" :loading="submitting" :disabled="form.password.length < 6 || form.password !== form.confirmPassword" @click="submit" />
    </template>
  </PrimeDialog>
</template>

<style scoped>
.setup-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid rgba(75, 128, 58, 0.22);
  border-radius: 14px;
  background: rgba(232, 244, 205, 0.72);
  color: #38612b;
}

h3,
p {
  margin: 0;
}

h3 {
  font-size: 19px;
  font-weight: 950;
}

p {
  margin-top: 4px;
  color: #596d36;
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
