import type { SystemQaAcceptanceReport, SystemQaCheckItem, SystemQaSummary } from '../system-qa.types';

export const completedModules = [
  '平板 UI',
  '资料查询',
  '文件上传预览',
  '版本审计',
  '数据导入',
  '资料维护',
  '角色权限',
  '知识库',
  '知识验证',
  '执行闭环',
  '统计看板',
  '演示工具',
  '全流程总验收',
];

export const notConnected = [
  '未接 Sealos PostgreSQL',
  '未接企业微信微盘',
  '未接真实企业微信登录',
  '未接真实语音识别',
  '未接真实生产数据',
];

export const recommendedCommands = [
  'npm run full-regression:check',
  'npm run data-consistency:check',
  'npm run acceptance:report',
  'npm run build',
  'npm run check',
];

export const nextRoutes = [
  '路线 A：创建 PR / 合并 main / 打演示 tag',
  '路线 B：接入 Sealos PostgreSQL 测试库',
  '路线 C：接企业微信微盘',
  '路线 D：接真实语音识别',
];

export function summarize(items: SystemQaCheckItem[]): SystemQaSummary {
  return {
    pass: items.filter((item) => item.status === 'pass').length,
    warning: items.filter((item) => item.status === 'warning').length,
    fail: items.filter((item) => item.status === 'fail').length,
  };
}

export function buildAcceptanceReportText(report: SystemQaAcceptanceReport) {
  return [
    `${report.releaseName}`,
    `版本：${report.version}`,
    `生成时间：${report.generatedAt}`,
    '',
    '已完成模块：',
    ...report.completedModules.map((module) => `- ${module}`),
    '',
    '当前未接入：',
    ...report.notConnected.map((item) => `- ${item}`),
    '',
    '检查结果：',
    `- 数据一致性：${report.checks.dataConsistency.valid ? '通过' : '需处理'} / ${report.checks.dataConsistency.score}分`,
    `- 业务链路：${report.checks.businessFlow.valid ? '通过' : '需处理'} / ${report.checks.businessFlow.score}分`,
    `- 权限回归：${report.checks.permissionRegression.valid ? '通过' : '需处理'} / ${report.checks.permissionRegression.score}分`,
    `- 演示准备：${report.checks.demoReadiness.valid ? '通过' : '需处理'} / ${report.checks.demoReadiness.score}分`,
    '',
    '建议执行命令：',
    ...report.recommendedCommands.map((command) => `- ${command}`),
    '',
    '安全边界：未连接数据库，未执行写库，未接企业微信微盘，未接真实语音，不提交 .env.local / uploads / metadata JSON。',
    '',
    '下一步路线：',
    ...report.nextRoutes.map((route) => `- ${route}`),
  ].join('\n');
}
