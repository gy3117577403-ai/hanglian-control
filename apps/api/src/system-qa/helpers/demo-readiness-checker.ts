import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { SystemQaCheckItem, SystemQaListReport } from '../system-qa.types';

function rootPath(...segments: string[]) {
  return join(process.cwd(), ...segments);
}

function exists(relativePath: string) {
  return existsSync(rootPath(relativePath));
}

function dirHasFiles(relativePath: string) {
  const absolute = rootPath(relativePath);
  if (!existsSync(absolute)) return false;
  return readdirSync(absolute).some((file) => !file.startsWith('.'));
}

function check(key: string, label: string, ok: boolean, message: string, warnWhenMissing = true): SystemQaCheckItem {
  return {
    key,
    label,
    status: ok ? 'pass' : warnWhenMissing ? 'warning' : 'fail',
    message,
    module: 'demo-readiness',
  };
}

export function buildDemoReadinessReport(): SystemQaListReport {
  const items: SystemQaCheckItem[] = [
    check('demo-assets', '演示上传资料', dirHasFiles('demo-upload-assets'), 'demo-upload-assets 可用于本地上传演示。'),
    check('demo-imports', '演示导入文件', dirHasFiles('demo-import-files'), 'demo-import-files 已准备 Excel 演示导入文件。'),
    check('demo-knowledge', '知识库演示文件', dirHasFiles('demo-knowledge-files'), 'demo-knowledge-files 已准备知识库演示导入文件。'),
    check('lan-scripts', 'LAN 平板演示脚本', exists('scripts/dev-lan.mjs'), '可通过 npm run dev:lan 启动局域网演示。'),
    check('pwa-config', 'PWA 平板配置', exists('apps/tablet/public/manifest.webmanifest') || exists('apps/tablet/vite.config.ts'), 'PWA 能力保留，平板可安装试用。'),
    check('docs-ready', '演示文档', exists('docs/v2.7-full-regression-qa.md') && exists('docs/release-notes-v2.7.md'), 'V2.7 文档和 Release Notes 已准备。'),
    check('github-actions', 'GitHub Actions', exists('.github/workflows'), '检测 GitHub Actions 工作流配置。'),
    check('security-ignore', '安全忽略', exists('.gitignore'), '.gitignore 已配置本地 env、uploads 和 metadata 忽略规则。', false),
    check('mock-labels', 'Mock 提示', exists('apps/tablet/src/config/app-version.ts'), '前端版本信息继续显示 Mock 数据源和未接真实服务。', false),
    check('no-sealos-label', '未接 Sealos 提示', exists('docs/sealos-gap-analysis-v2.7.md'), 'Sealos 差距清单已明确当前未接测试库。', false),
  ];
  const errors = items.filter((item) => item.status === 'fail');
  const warnings = items.filter((item) => item.status === 'warning');
  return {
    valid: errors.length === 0,
    score: Math.max(0, 100 - warnings.length * 3 - errors.length * 10),
    errors,
    warnings,
    items,
    generatedAt: new Date().toISOString(),
  };
}
