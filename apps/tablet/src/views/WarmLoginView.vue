<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Factory, LockKeyhole, ShieldCheck, UserRoundCog } from 'lucide-vue-next'
import { APP_BUILD_CHANNEL, APP_RELEASE_NAME, APP_STAGE, APP_VERSION } from '@/config/app-version'
import { permissionLabels } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth-store'
import type { MockUser } from '@/types/production'

const router = useRouter()
const auth = useAuthStore()

const roleCards = computed(() => auth.mockUsers)

function importantPermissions(user: MockUser) {
  return (user.permissions ?? []).slice(0, 5).map((permission) => permissionLabels[permission] ?? permission)
}

async function login(user: MockUser) {
  await auth.mockLogin(user.userId)
  await router.push('/tablet')
}

onMounted(async () => {
  await auth.loadMockUsers()
  await auth.loadPermissionMatrix()
})
</script>

<template>
  <main class="warm-login-shell">
    <section class="warm-login-hero warm-enter">
      <div class="warm-logo-mark warm-login-mark">
        <Factory :size="36" stroke-width="2.4" />
      </div>
      <div class="min-w-0">
        <p class="section-kicker">HANG LIAN CONTROL / LOCAL MOCK RBAC</p>
        <h1>{{ APP_RELEASE_NAME }}</h1>
        <p>
          当前为本机 Mock 登录与角色权限演示，不接企业微信登录，不保存真实账号，不连接 Sealos 数据库。
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <PrimeTag severity="warn" :value="`${APP_VERSION} ${APP_STAGE}`" />
          <PrimeTag severity="info" :value="APP_BUILD_CHANNEL" />
          <PrimeTag severity="success" value="localStorage 会话" />
        </div>
      </div>
    </section>

    <section class="warm-login-notice warm-enter">
      <LockKeyhole :size="22" />
      <span>请选择一个演示角色进入系统。后端 Mock API 会按角色校验按钮、菜单和写入动作权限。</span>
    </section>

    <section class="warm-role-grid warm-enter">
      <button
        v-for="user in roleCards"
        :key="user.userId"
        type="button"
        class="warm-role-card"
        :disabled="auth.loading"
        @click="login(user)"
      >
        <div class="warm-role-icon">
          <UserRoundCog :size="26" />
        </div>
        <div class="min-w-0">
          <div class="flex items-center justify-between gap-3">
            <h2>{{ user.roleLabel }}</h2>
            <PrimeTag severity="secondary" :value="user.team" />
          </div>
          <p class="mt-1">{{ user.name }}</p>
          <p class="warm-role-desc">{{ user.description }}</p>
          <div class="warm-role-permissions">
            <span v-for="item in importantPermissions(user)" :key="item">{{ item }}</span>
          </div>
        </div>
      </button>
    </section>

    <section class="warm-login-footer warm-enter">
      <ShieldCheck :size="18" />
      <span>安全边界：仅本地 Mock 用户，禁止写入真实密钥，禁止连接真实数据库，禁止上传真实客户资料。</span>
    </section>
  </main>
</template>
