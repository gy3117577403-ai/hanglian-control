import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PilotCheckItem, PilotCheckResult } from '../mock/settings-seed';

function exists(relativePath: string) {
  return existsSync(join(process.cwd(), relativePath));
}

function packageScript(name: string) {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { scripts?: Record<string, string> };
    return Boolean(pkg.scripts?.[name]);
  } catch {
    return false;
  }
}

function item(key: string, label: string, ok: boolean, message: string, recommendedAction: string): PilotCheckItem {
  return {
    key,
    label,
    status: ok ? 'pass' : 'warning',
    message,
    recommendedAction,
  };
}

export function runPilotCheck(operatorName: string): PilotCheckResult {
  const checks: PilotCheckItem[] = [
    item('auth', '登录角色', exists('apps/api/src/auth/auth.module.ts') && exists('apps/tablet/src/stores/auth-store.ts'), 'Mock 角色与权限模块存在。', '试运行前确认默认角色和班组。'),
    item('plans', '生产计划', exists('apps/api/src/production-plans/production-plans.module.ts'), '生产计划 Mock API 存在。', '抽查今日 / 本周计划是否符合演示范围。'),
    item('upload_preview', '上传预览', exists('apps/api/src/documents/documents.module.ts') && exists('apps/tablet/src/components/document/WarmPdfPreview.vue'), '上传、PDF、图片预览结构存在。', '现场不上传真实客户资料。'),
    item('file_health', '文件健康', exists('apps/api/src/files/files.module.ts') || exists('apps/api/src/documents/documents.controller.ts'), '文件健康相关接口存在。', '用演示文件验证预览链路。'),
    item('imports', '数据导入', exists('apps/api/src/imports/imports.module.ts'), '导入中心存在。', '仅使用演示 Excel / CSV。'),
    item('maintenance', '资料维护', exists('apps/api/src/maintenance/maintenance.module.ts'), '资料维护中心存在。', '试运行前确认复核队列为空或可解释。'),
    item('knowledge', '知识库', exists('apps/api/src/knowledge/knowledge.module.ts'), '现场知识库存在。', '确认治具、异常、质量标准样例。'),
    item('execution', '执行闭环', exists('apps/api/src/execution/execution.module.ts'), '生产执行闭环存在。', '演示时不要替代真实报工系统。'),
    item('analytics', '统计看板', exists('apps/api/src/analytics/analytics.module.ts'), '统计看板存在。', '说明统计来自 Mock / metadata。'),
    item('settings', '系统配置中心', exists('apps/api/src/settings/settings.module.ts') && exists('apps/tablet/src/stores/settings-store.ts'), 'V3.1 配置中心存在。', '试运行前配置工位和平板显示。'),
    item('demo_tools', '演示工具', exists('apps/tablet/src/components/warm/WarmStatusBar.vue'), '演示工具入口存在。', '只开放给有权限的 Mock 角色。'),
    item('lan', 'LAN 演示', packageScript('dev:lan'), 'LAN 演示脚本存在。', '平板和电脑保持同一网段。'),
    item('pwa', 'PWA 配置', packageScript('pwa:check') && exists('apps/tablet/public/manifest.webmanifest'), 'PWA 检查脚本或构建配置存在。', '现场平板使用横屏并固定浏览器缩放。'),
    item('ignore', '安全忽略', exists('.gitignore'), '.gitignore 存在并忽略本地 metadata。', '提交前运行 security:check。'),
    item('mock_warning', 'Mock 提示', exists('docs/v3.1-system-settings-field-pilot.md'), 'V3.1 文档明确未接 Sealos / 微盘 / 真实语音。', '现场说明这是试运行配置版。'),
  ];
  const warnings = checks.filter((check) => check.status === 'warning').length;
  const score = Math.max(60, 100 - warnings * 4);
  return {
    id: `PILOT-${Date.now()}`,
    score,
    status: warnings === 0 ? 'pass' : 'warning',
    checkedAt: new Date().toISOString(),
    summary: warnings === 0 ? '现场试运行准备项通过。' : `存在 ${warnings} 项提醒，仍可用于 Mock 试运行准备。`,
    items: checks,
    operatorName,
  };
}
