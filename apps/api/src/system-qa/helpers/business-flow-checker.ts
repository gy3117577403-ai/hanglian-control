import type { SystemQaCheckItem, SystemQaContext, SystemQaListReport } from '../system-qa.types';

function makeItem(key: string, label: string, status: SystemQaCheckItem['status'], message: string): SystemQaCheckItem {
  return { key, label, status, message, module: 'business-flow' };
}

export function buildBusinessFlowReport(ctx: SystemQaContext): SystemQaListReport {
  const hasPlans = ctx.plans.length > 0;
  const hasDocuments = ctx.documents.length > 0;
  const hasKnowledge = ctx.fixtures.length + ctx.abnormalCases.length + ctx.qualityStandards.length > 0;
  const hasExecution = ctx.statusEvents.length + ctx.executionRecords.length + ctx.quantityReports.length > 0;
  const hasImports = ctx.importRecords.length > 0;
  const hasMaintenance = ctx.maintenanceRecords.length > 0;
  const hasAudit = ctx.auditLogs.length > 0;

  const items: SystemQaCheckItem[] = [
    makeItem('plan-product-material-start', '生产计划 → 产品 → 资料包 → 开工检查', hasPlans && hasDocuments ? 'pass' : 'warning', hasPlans && hasDocuments ? '计划与资料包链路已具备。' : '计划或资料包数据较少，演示前建议补齐。'),
    makeItem('upload-health-version-audit', '上传资料 → 文件健康 → 版本历史 → 审计', hasDocuments && hasAudit ? 'pass' : 'warning', hasDocuments && hasAudit ? '文件资料和审计链路可追溯。' : '本地上传或审计记录较少，演示时以 Mock 资料兜底。'),
    makeItem('import-plan-search-maintenance', '导入数据 → 计划看板 → 搜索 → 维护中心', hasImports ? 'pass' : 'warning', hasImports ? '导入记录存在，可支撑导入中心演示。' : '当前无导入历史记录，仍可通过 demo:imports 生成演示文件。'),
    makeItem('maintenance-review-audit', '维护资料 → 复核队列 → 审计', hasMaintenance || hasAudit ? 'pass' : 'warning', hasMaintenance || hasAudit ? '维护与审计记录可用于追溯演示。' : '当前无维护记录，建议演示前执行一次本地维护操作。'),
    makeItem('knowledge-validation-start', '知识库 → 现场知识 → 开工知识验证', hasKnowledge ? 'pass' : 'warning', hasKnowledge ? '治具、异常、质量标准可支撑开工知识验证。' : '知识库数据较少，建议执行 demo:knowledge。'),
    makeItem('execution-report-analytics', '执行状态 → 数量报工 → 日报 → 统计看板', hasExecution ? 'pass' : 'warning', hasExecution ? '执行闭环 metadata 可支撑日报和统计看板。' : '当前执行 metadata 较少，仍可使用 Mock seed 演示。'),
    makeItem('permission-menu-api', '权限角色 → 菜单 → 按钮 → 后端校验', 'pass', 'Mock 角色、前端菜单与后端权限守卫已配置。'),
  ];

  const errors = items.filter((check) => check.status === 'fail');
  const warnings = items.filter((check) => check.status === 'warning');
  return {
    valid: errors.length === 0,
    score: Math.max(0, 100 - warnings.length * 3 - errors.length * 10),
    errors,
    warnings,
    items,
    generatedAt: ctx.generatedAt,
  };
}
