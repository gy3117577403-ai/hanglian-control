export type MockRole =
  | 'front_leader'
  | 'back_leader'
  | 'maintainer'
  | 'process_engineer'
  | 'quality'
  | 'admin';

export type Permission =
  | 'plan.view'
  | 'plan.view.all'
  | 'plan.confirm'
  | 'plan.update'
  | 'plan.feedback'
  | 'front.view'
  | 'front.parameter.view'
  | 'front.parameter.update'
  | 'back.view'
  | 'back.package.view'
  | 'back.package.update'
  | 'document.view'
  | 'document.upload'
  | 'document.update'
  | 'document.set_effective'
  | 'document.archive'
  | 'document.audit.view'
  | 'import.view'
  | 'import.preview'
  | 'import.apply'
  | 'import.history.view'
  | 'maintenance.view'
  | 'maintenance.customer.update'
  | 'maintenance.product.update'
  | 'maintenance.plan.update'
  | 'maintenance.parameter.update'
  | 'maintenance.package.update'
  | 'maintenance.document.update'
  | 'maintenance.review.resolve'
  | 'knowledge.fixture.view'
  | 'knowledge.fixture.create'
  | 'knowledge.fixture.update'
  | 'knowledge.abnormal.view'
  | 'knowledge.abnormal.create'
  | 'knowledge.abnormal.update'
  | 'knowledge.quality.view'
  | 'knowledge.quality.create'
  | 'knowledge.quality.update'
  | 'knowledge.history.view'
  | 'execution.view'
  | 'execution.start'
  | 'execution.pause'
  | 'execution.resume'
  | 'execution.exception_hold'
  | 'execution.complete'
  | 'execution.quantity_report'
  | 'execution.process_confirm'
  | 'execution.handover'
  | 'execution.daily_report.view'
  | 'analytics.view'
  | 'analytics.production.view'
  | 'analytics.quality.view'
  | 'analytics.document.view'
  | 'analytics.knowledge.view'
  | 'analytics.summary.copy'
  | 'system.info.view'
  | 'system.diagnostics.view'
  | 'system.demo_tools.view'
  | 'system.roadmap.view'
  | 'system.freeze_check.view'
  | 'admin.user.view'
  | 'admin.permission.view'
  | 'admin.all';

export interface MockUser {
  userId: string;
  role: MockRole;
  roleLabel: string;
  name: string;
  team: string;
  description: string;
}

export interface MockSession {
  token: string;
  user: MockUser;
  permissions: Permission[];
}

export const allPermissions: Permission[] = [
  'plan.view',
  'plan.view.all',
  'plan.confirm',
  'plan.update',
  'plan.feedback',
  'front.view',
  'front.parameter.view',
  'front.parameter.update',
  'back.view',
  'back.package.view',
  'back.package.update',
  'document.view',
  'document.upload',
  'document.update',
  'document.set_effective',
  'document.archive',
  'document.audit.view',
  'import.view',
  'import.preview',
  'import.apply',
  'import.history.view',
  'maintenance.view',
  'maintenance.customer.update',
  'maintenance.product.update',
  'maintenance.plan.update',
  'maintenance.parameter.update',
  'maintenance.package.update',
  'maintenance.document.update',
  'maintenance.review.resolve',
  'knowledge.fixture.view',
  'knowledge.fixture.create',
  'knowledge.fixture.update',
  'knowledge.abnormal.view',
  'knowledge.abnormal.create',
  'knowledge.abnormal.update',
  'knowledge.quality.view',
  'knowledge.quality.create',
  'knowledge.quality.update',
  'knowledge.history.view',
  'execution.view',
  'execution.start',
  'execution.pause',
  'execution.resume',
  'execution.exception_hold',
  'execution.complete',
  'execution.quantity_report',
  'execution.process_confirm',
  'execution.handover',
  'execution.daily_report.view',
  'analytics.view',
  'analytics.production.view',
  'analytics.quality.view',
  'analytics.document.view',
  'analytics.knowledge.view',
  'analytics.summary.copy',
  'system.info.view',
  'system.diagnostics.view',
  'system.demo_tools.view',
  'system.roadmap.view',
  'system.freeze_check.view',
  'admin.user.view',
  'admin.permission.view',
  'admin.all',
];

export const mockUsers: MockUser[] = [
  {
    userId: 'mock-front-leader',
    role: 'front_leader',
    roleLabel: '前段组长',
    name: '前段组长演示',
    team: 'A 班',
    description: '查看前段参数、确认计划、提交异常反馈。',
  },
  {
    userId: 'mock-back-leader',
    role: 'back_leader',
    roleLabel: '后段组长',
    name: '后段组长演示',
    team: 'A 班',
    description: '查看后段资料、孔位图、SOP、成品图并确认计划。',
  },
  {
    userId: 'mock-maintainer',
    role: 'maintainer',
    roleLabel: '资料维护',
    name: '资料维护演示',
    team: '工艺资料组',
    description: '导入资料、维护版本、处理资料复核队列。',
  },
  {
    userId: 'mock-process-engineer',
    role: 'process_engineer',
    roleLabel: '工艺',
    name: '工艺演示',
    team: '工艺组',
    description: '维护前段参数、后段资料包和资料版本。',
  },
  {
    userId: 'mock-quality',
    role: 'quality',
    roleLabel: '品质',
    name: '品质演示',
    team: '品质组',
    description: '查看资料、审计记录并处理复核队列。',
  },
  {
    userId: 'mock-admin',
    role: 'admin',
    roleLabel: '管理员',
    name: '管理员演示',
    team: '系统管理',
    description: '查看全部功能和权限说明。',
  },
];

export const rolePermissions: Record<MockRole, Permission[]> = {
  front_leader: [
    'plan.view',
    'plan.confirm',
    'plan.feedback',
    'front.view',
    'front.parameter.view',
    'document.view',
    'document.audit.view',
    'knowledge.fixture.view',
    'knowledge.abnormal.view',
    'knowledge.quality.view',
    'execution.view',
    'execution.start',
    'execution.pause',
    'execution.resume',
    'execution.exception_hold',
    'execution.complete',
    'execution.quantity_report',
    'execution.process_confirm',
    'execution.handover',
    'execution.daily_report.view',
    'analytics.view',
    'analytics.production.view',
    'analytics.document.view',
    'analytics.summary.copy',
    'system.info.view',
    'system.diagnostics.view',
    'system.demo_tools.view',
  ],
  back_leader: [
    'plan.view',
    'plan.confirm',
    'plan.feedback',
    'back.view',
    'back.package.view',
    'document.view',
    'document.audit.view',
    'knowledge.fixture.view',
    'knowledge.abnormal.view',
    'knowledge.quality.view',
    'execution.view',
    'execution.start',
    'execution.pause',
    'execution.resume',
    'execution.exception_hold',
    'execution.complete',
    'execution.quantity_report',
    'execution.process_confirm',
    'execution.handover',
    'execution.daily_report.view',
    'analytics.view',
    'analytics.production.view',
    'analytics.document.view',
    'analytics.summary.copy',
    'system.info.view',
    'system.diagnostics.view',
    'system.demo_tools.view',
  ],
  maintainer: [
    'plan.view.all',
    'document.view',
    'document.upload',
    'document.update',
    'document.set_effective',
    'document.archive',
    'document.audit.view',
    'import.view',
    'import.preview',
    'import.apply',
    'import.history.view',
    'maintenance.view',
    'maintenance.customer.update',
    'maintenance.product.update',
    'maintenance.plan.update',
    'maintenance.parameter.update',
    'maintenance.package.update',
    'maintenance.document.update',
    'maintenance.review.resolve',
    'knowledge.fixture.view',
    'knowledge.fixture.create',
    'knowledge.fixture.update',
    'knowledge.abnormal.view',
    'knowledge.abnormal.create',
    'knowledge.abnormal.update',
    'knowledge.quality.view',
    'knowledge.quality.create',
    'knowledge.quality.update',
    'knowledge.history.view',
    'execution.view',
    'execution.daily_report.view',
    'analytics.view',
    'analytics.document.view',
    'analytics.knowledge.view',
    'analytics.summary.copy',
    'system.info.view',
    'system.diagnostics.view',
    'system.demo_tools.view',
  ],
  process_engineer: [
    'plan.view.all',
    'front.view',
    'front.parameter.view',
    'front.parameter.update',
    'back.view',
    'back.package.view',
    'back.package.update',
    'document.view',
    'document.upload',
    'document.update',
    'document.set_effective',
    'document.audit.view',
    'maintenance.view',
    'maintenance.parameter.update',
    'maintenance.package.update',
    'maintenance.document.update',
    'maintenance.review.resolve',
    'knowledge.fixture.view',
    'knowledge.fixture.update',
    'knowledge.abnormal.view',
    'knowledge.abnormal.update',
    'knowledge.quality.view',
    'knowledge.quality.update',
    'knowledge.history.view',
    'execution.view',
    'execution.process_confirm',
    'execution.exception_hold',
    'execution.daily_report.view',
    'analytics.view',
    'analytics.production.view',
    'analytics.document.view',
    'analytics.knowledge.view',
    'analytics.summary.copy',
    'system.info.view',
    'system.diagnostics.view',
  ],
  quality: [
    'plan.view.all',
    'document.view',
    'document.audit.view',
    'maintenance.view',
    'maintenance.review.resolve',
    'knowledge.fixture.view',
    'knowledge.abnormal.view',
    'knowledge.abnormal.update',
    'knowledge.quality.view',
    'knowledge.quality.update',
    'knowledge.history.view',
    'execution.view',
    'execution.process_confirm',
    'execution.exception_hold',
    'execution.daily_report.view',
    'analytics.view',
    'analytics.quality.view',
    'analytics.document.view',
    'analytics.knowledge.view',
    'analytics.summary.copy',
    'system.info.view',
    'system.diagnostics.view',
  ],
  admin: allPermissions,
};

export function permissionsForRole(role: MockRole) {
  return role === 'admin' ? allPermissions : rolePermissions[role];
}

export function findMockUser(userId?: string) {
  return mockUsers.find((user) => user.userId === userId);
}

export function tokenForUser(user: MockUser) {
  return `mock-token-${user.userId}`;
}

export function userIdFromToken(token?: string) {
  if (!token?.startsWith('mock-token-')) return undefined;
  return token.replace(/^mock-token-/, '');
}

export function resolveMockUserFromRequestLike(request: {
  headers?: Record<string, string | string[] | undefined>;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
}) {
  const authorization = request.headers?.authorization;
  const authorizationText = Array.isArray(authorization) ? authorization[0] : authorization;
  const bearer = authorizationText?.replace(/^Bearer\s+/i, '');
  const headerUser = request.headers?.['x-mock-user-id'];
  const headerUserText = Array.isArray(headerUser) ? headerUser[0] : headerUser;
  const userId = userIdFromToken(bearer)
    ?? headerUserText
    ?? String(request.query?.userId ?? request.body?.userId ?? request.body?.operatorId ?? '')
    ?? undefined;
  return findMockUser(userId) ?? mockUsers[0];
}
