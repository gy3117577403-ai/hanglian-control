import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { toast } from 'vue-sonner'
import { getCurrentAuthUser, getMockUsers, getPermissionMatrix, logoutMockUser, mockLogin as mockLoginApi } from '@/services/api'
import { hasAllPermissions, hasAnyPermission, hasPermission as checkPermission } from '@/lib/permissions'
import type { AuthSession, MockRole, MockUser, Permission, PermissionMatrixResponse } from '@/types/production'

const STORAGE_KEYS = {
  token: 'hanglian.auth.token',
  currentUser: 'hanglian.auth.currentUser',
  permissions: 'hanglian.auth.permissions',
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeSession(session: AuthSession | null) {
  if (typeof localStorage === 'undefined') return
  if (!session) {
    localStorage.removeItem(STORAGE_KEYS.token)
    localStorage.removeItem(STORAGE_KEYS.currentUser)
    localStorage.removeItem(STORAGE_KEYS.permissions)
    return
  }
  localStorage.setItem(STORAGE_KEYS.token, session.token)
  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(session.user))
  localStorage.setItem(STORAGE_KEYS.permissions, JSON.stringify(session.permissions))
}

function readToken() {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem(STORAGE_KEYS.token) ?? ''
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(readToken())
  const currentUser = ref<MockUser | null>(readJson<MockUser | null>(STORAGE_KEYS.currentUser, null))
  const permissions = ref<Permission[]>(readJson<Permission[]>(STORAGE_KEYS.permissions, []))
  const mockUsers = ref<MockUser[]>([])
  const permissionMatrix = ref<PermissionMatrixResponse | null>(null)
  const loading = ref(false)
  const errorMessage = ref('')

  const loggedIn = computed(() => Boolean(token.value && currentUser.value))
  const role = computed<MockRole | null>(() => currentUser.value?.role ?? null)
  const roleLabel = computed(() => currentUser.value?.roleLabel ?? '未登录')
  const userName = computed(() => currentUser.value?.name ?? '未选择角色')
  const team = computed(() => currentUser.value?.team ?? '本地演示')

  function applySession(session: AuthSession) {
    token.value = session.token
    currentUser.value = session.user
    permissions.value = session.permissions
    writeSession(session)
  }

  async function loadMockUsers() {
    loading.value = true
    try {
      mockUsers.value = await getMockUsers()
      errorMessage.value = ''
      return mockUsers.value
    } catch {
      errorMessage.value = 'Mock 用户列表加载失败，请确认后端 API 已启动。'
      return mockUsers.value
    } finally {
      loading.value = false
    }
  }

  async function loadPermissionMatrix() {
    try {
      permissionMatrix.value = await getPermissionMatrix()
      return permissionMatrix.value
    } catch {
      return permissionMatrix.value
    }
  }

  async function mockLogin(userId: string) {
    loading.value = true
    try {
      const session = await mockLoginApi(userId)
      applySession(session)
      await loadPermissionMatrix()
      toast.success('已切换 Mock 角色', {
        description: `${session.user.name} / ${session.user.roleLabel}`,
      })
      return session
    } catch {
      errorMessage.value = 'Mock 登录失败，请确认后端 API 已启动。'
      toast.error('Mock 登录失败', { description: errorMessage.value })
      throw new Error(errorMessage.value)
    } finally {
      loading.value = false
    }
  }

  async function loadMe() {
    if (!token.value) return null
    loading.value = true
    try {
      const session = await getCurrentAuthUser()
      applySession(session)
      await loadPermissionMatrix()
      errorMessage.value = ''
      return session
    } catch {
      writeSession(null)
      token.value = ''
      currentUser.value = null
      permissions.value = []
      errorMessage.value = '本地 Mock 会话已失效，请重新选择角色。'
      return null
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      if (token.value) await logoutMockUser().catch(() => undefined)
    } finally {
      writeSession(null)
      token.value = ''
      currentUser.value = null
      permissions.value = []
      toast.info('已退出本地 Mock 角色')
    }
  }

  function hasPermission(permission: Permission) {
    return checkPermission(permissions.value, permission)
  }

  function hasAny(list: Permission[]) {
    return hasAnyPermission(permissions.value, list)
  }

  function hasAll(list: Permission[]) {
    return hasAllPermissions(permissions.value, list)
  }

  return {
    token,
    currentUser,
    permissions,
    mockUsers,
    permissionMatrix,
    loading,
    errorMessage,
    loggedIn,
    role,
    roleLabel,
    userName,
    team,
    applySession,
    loadMockUsers,
    loadPermissionMatrix,
    mockLogin,
    loadMe,
    logout,
    hasPermission,
    hasAny,
    hasAll,
  }
})
