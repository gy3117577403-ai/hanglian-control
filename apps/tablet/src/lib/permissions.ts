import type { MockRole, Permission } from '@/types/production'

export const PERMISSIONS = {
  PLAN_VIEW: 'plan.view',
  PLAN_VIEW_ALL: 'plan.view.all',
  PLAN_CONFIRM: 'plan.confirm',
  PLAN_FEEDBACK: 'plan.feedback',
  DOCUMENT_VIEW: 'document.view',
  DOCUMENT_UPLOAD: 'document.upload',
  DOCUMENT_UPDATE: 'document.update',
  DOCUMENT_SET_EFFECTIVE: 'document.set_effective',
  DOCUMENT_ARCHIVE: 'document.archive',
  DOCUMENT_AUDIT_VIEW: 'document.audit.view',
  IMPORT_VIEW: 'import.view',
  IMPORT_PREVIEW: 'import.preview',
  IMPORT_APPLY: 'import.apply',
  IMPORT_HISTORY_VIEW: 'import.history.view',
  MAINTENANCE_VIEW: 'maintenance.view',
  MAINTENANCE_CUSTOMER_UPDATE: 'maintenance.customer.update',
  MAINTENANCE_PRODUCT_UPDATE: 'maintenance.product.update',
  MAINTENANCE_PLAN_UPDATE: 'maintenance.plan.update',
  MAINTENANCE_PARAMETER_UPDATE: 'maintenance.parameter.update',
  MAINTENANCE_PACKAGE_UPDATE: 'maintenance.package.update',
  MAINTENANCE_DOCUMENT_UPDATE: 'maintenance.document.update',
  MAINTENANCE_REVIEW_RESOLVE: 'maintenance.review.resolve',
  KNOWLEDGE_FIXTURE_VIEW: 'knowledge.fixture.view',
  KNOWLEDGE_FIXTURE_CREATE: 'knowledge.fixture.create',
  KNOWLEDGE_FIXTURE_UPDATE: 'knowledge.fixture.update',
  KNOWLEDGE_ABNORMAL_VIEW: 'knowledge.abnormal.view',
  KNOWLEDGE_ABNORMAL_CREATE: 'knowledge.abnormal.create',
  KNOWLEDGE_ABNORMAL_UPDATE: 'knowledge.abnormal.update',
  KNOWLEDGE_QUALITY_VIEW: 'knowledge.quality.view',
  KNOWLEDGE_QUALITY_CREATE: 'knowledge.quality.create',
  KNOWLEDGE_QUALITY_UPDATE: 'knowledge.quality.update',
  KNOWLEDGE_HISTORY_VIEW: 'knowledge.history.view',
  SYSTEM_INFO_VIEW: 'system.info.view',
  SYSTEM_DIAGNOSTICS_VIEW: 'system.diagnostics.view',
  SYSTEM_DEMO_TOOLS_VIEW: 'system.demo_tools.view',
  SYSTEM_ROADMAP_VIEW: 'system.roadmap.view',
  SYSTEM_FREEZE_CHECK_VIEW: 'system.freeze_check.view',
  ADMIN_ALL: 'admin.all',
} as const satisfies Record<string, Permission>

export const roleLabels: Record<MockRole, string> = {
  front_leader: '前段组长',
  back_leader: '后段组长',
  maintainer: '资料维护',
  process_engineer: '工艺',
  quality: '品质',
  admin: '管理员',
}

export const permissionLabels: Record<Permission, string> = {
  'plan.view': '查看生产计划',
  'plan.view.all': '查看全部计划',
  'plan.confirm': '组长确认',
  'plan.update': '维护生产计划',
  'plan.feedback': '异常反馈',
  'front.view': '查看前段',
  'front.parameter.view': '查看前段参数',
  'front.parameter.update': '维护前段参数',
  'back.view': '查看后段',
  'back.package.view': '查看后段资料包',
  'back.package.update': '维护后段资料包',
  'document.view': '查看文件资料',
  'document.upload': '上传文件资料',
  'document.update': '维护文件资料',
  'document.set_effective': '设为当前有效',
  'document.archive': '归档资料',
  'document.audit.view': '查看审计',
  'import.view': '查看导入中心',
  'import.preview': '导入预览',
  'import.apply': '应用导入',
  'import.history.view': '查看导入历史',
  'maintenance.view': '查看维护中心',
  'maintenance.customer.update': '维护客户',
  'maintenance.product.update': '维护产品',
  'maintenance.plan.update': '维护计划',
  'maintenance.parameter.update': '维护前段参数',
  'maintenance.package.update': '维护后段资料包',
  'maintenance.document.update': '维护文件资料',
  'maintenance.review.resolve': '处理复核队列',
  'knowledge.fixture.view': '查看治具库',
  'knowledge.fixture.create': '新增治具资料',
  'knowledge.fixture.update': '维护治具资料',
  'knowledge.abnormal.view': '查看异常库',
  'knowledge.abnormal.create': '新增异常案例',
  'knowledge.abnormal.update': '维护异常案例',
  'knowledge.quality.view': '查看质量标准库',
  'knowledge.quality.create': '新增质量标准',
  'knowledge.quality.update': '维护质量标准',
  'knowledge.history.view': '查看知识库维护历史',
  'system.info.view': '查看系统信息',
  'system.diagnostics.view': '查看诊断',
  'system.demo_tools.view': '查看演示工具',
  'system.roadmap.view': '查看路线',
  'system.freeze_check.view': '查看冻结检查',
  'admin.user.view': '查看用户',
  'admin.permission.view': '查看权限',
  'admin.all': '全部权限',
}

export function hasPermission(permissions: Permission[], permission: Permission) {
  return permissions.includes(PERMISSIONS.ADMIN_ALL) || permissions.includes(permission)
}

export function hasAnyPermission(permissions: Permission[], required: Permission[]) {
  return required.some((permission) => hasPermission(permissions, permission))
}

export function hasAllPermissions(permissions: Permission[], required: Permission[]) {
  return required.every((permission) => hasPermission(permissions, permission))
}

export const canAccessMaintenance = (permissions: Permission[]) => hasPermission(permissions, PERMISSIONS.MAINTENANCE_VIEW)
export const canUploadDocument = (permissions: Permission[]) => hasPermission(permissions, PERMISSIONS.DOCUMENT_UPLOAD)
export const canApplyImport = (permissions: Permission[]) => hasPermission(permissions, PERMISSIONS.IMPORT_APPLY)
export const canConfirmPlan = (permissions: Permission[]) => hasPermission(permissions, PERMISSIONS.PLAN_CONFIRM)
export const canSetEffective = (permissions: Permission[]) => hasPermission(permissions, PERMISSIONS.DOCUMENT_SET_EFFECTIVE)
