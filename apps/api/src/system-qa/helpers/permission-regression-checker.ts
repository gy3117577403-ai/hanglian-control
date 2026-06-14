import { mockUsers, permissionsForRole, type MockRole, type Permission } from '../../auth/mock-users';
import type { SystemQaCheckItem } from '../system-qa.types';

const expectedByRole: Record<MockRole, Permission[]> = {
  front_leader: ['plan.view', 'plan.confirm', 'front.parameter.view', 'document.view', 'execution.start', 'analytics.view'],
  back_leader: ['plan.view', 'plan.confirm', 'back.package.view', 'document.view', 'execution.start', 'analytics.view'],
  maintainer: ['document.upload', 'import.view', 'maintenance.view', 'maintenance.review.resolve'],
  process_engineer: ['front.parameter.update', 'back.package.update', 'maintenance.view', 'knowledge.fixture.update'],
  quality: ['knowledge.quality.view', 'knowledge.abnormal.update', 'maintenance.review.resolve', 'analytics.quality.view'],
  admin: ['admin.all'],
};

const shouldBlockByRole: Record<MockRole, Permission[]> = {
  front_leader: ['import.apply', 'maintenance.document.update', 'admin.all'],
  back_leader: ['import.apply', 'maintenance.document.update', 'admin.all'],
  maintainer: ['execution.start', 'execution.complete', 'admin.all'],
  process_engineer: ['admin.all', 'import.apply'],
  quality: ['document.upload', 'admin.all'],
  admin: [],
};

function labelsFor(permissions: Permission[]) {
  return permissions.map((permission) => permission);
}

export function buildPermissionRegressionReport() {
  const roleReports = mockUsers.map((user) => {
    const permissions = permissionsForRole(user.role);
    const missing = expectedByRole[user.role].filter((permission) => !permissions.includes(permission) && !permissions.includes('admin.all'));
    const overGranted = shouldBlockByRole[user.role].filter((permission) => permissions.includes(permission) && !permissions.includes('admin.all'));
    return {
      role: user.role,
      roleLabel: user.roleLabel,
      visibleMenus: labelsFor(permissions.filter((permission) => permission.endsWith('.view') || permission.includes('demo_tools'))),
      allowedActions: labelsFor(permissions.filter((permission) => !permission.endsWith('.view'))),
      shouldBlockActions: labelsFor(shouldBlockByRole[user.role]),
      missingWarnings: missing.map((permission) => `缺少建议权限：${permission}`),
      overGrantedWarnings: overGranted.map((permission) => `可能过度授权：${permission}`),
      status: missing.length ? 'warning' : 'pass',
    };
  });
  const warnings: SystemQaCheckItem[] = roleReports.flatMap((report) => [
    ...report.missingWarnings.map((message) => ({
      key: `permission-missing-${report.role}-${message}`,
      label: `${report.roleLabel} 权限缺失`,
      status: 'warning' as const,
      message,
      module: 'permission',
    })),
    ...report.overGrantedWarnings.map((message) => ({
      key: `permission-over-${report.role}-${message}`,
      label: `${report.roleLabel} 过度授权`,
      status: 'warning' as const,
      message,
      module: 'permission',
    })),
  ]);
  return {
    valid: true,
    score: Math.max(0, 100 - warnings.length * 2),
    roles: roleReports,
    warnings,
    errors: [] as SystemQaCheckItem[],
    generatedAt: new Date().toISOString(),
  };
}
