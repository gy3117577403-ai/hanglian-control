import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const reportPath = join(root, 'docs/generated/real-data-upload-preflight-report.md');
const uploadsDir = join(root, 'apps/api/storage/uploads');
const documentsJson = join(root, 'apps/api/storage/metadata/documents.json');
const auditLogsJson = join(root, 'apps/api/storage/metadata/audit-logs.json');
const startedAt = new Date();
const results = [];
const failures = [];

const commands = [
  {
    name: 'real data local sandbox empty status',
    command: ['npm', 'run', 'real-data:status:empty'],
  },
  {
    name: '生成安全演示资料',
    command: ['npm', 'run', 'demo:assets'],
  },
  {
    name: '统一资料中心上传沙盒',
    command: ['npm', 'run', 'upload-sandbox:check'],
  },
  {
    name: '主页面资料库上传/预览/删除沙盒',
    command: ['npm', 'run', 'document-hub-upload:check'],
  },
  {
    name: 'real data tagged cleanup selftest',
    command: ['npm', 'run', 'real-data:cleanup:selftest'],
  },
  {
    name: '平板主界面浏览器交互回归',
    command: ['npm', 'run', 'tablet-ui-interaction:check'],
  },
  {
    name: '平板生产构建预览回归',
    command: ['npm', 'run', 'tablet-production:check'],
  },
  {
    name: '本地文件流只读检查',
    command: ['npm', 'run', 'file-flow:check'],
  },
  {
    name: '敏感信息安全检查',
    command: ['npm', 'run', 'security:check'],
  },
  {
    name: '完整构建',
    command: ['npm', 'run', 'build'],
  },
  {
    name: '总检查',
    command: ['npm', 'run', 'check'],
  },
];

function runCommand(step) {
  const started = Date.now();
  const [baseCommand, ...baseArgs] = step.command;
  const command = process.platform === 'win32' ? 'cmd.exe' : baseCommand;
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', [baseCommand, ...baseArgs].join(' ')]
    : baseArgs;

  console.log(`\n=== ${step.name} ===`);
  console.log(`$ ${step.command.join(' ')}`);

  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
    stdio: 'inherit',
    windowsHide: true,
  });

  const elapsedSeconds = ((Date.now() - started) / 1000).toFixed(1);
  const ok = result.status === 0;
  results.push({
    name: step.name,
    command: step.command.join(' '),
    ok,
    elapsedSeconds,
  });

  if (!ok) {
    failures.push(`${step.name} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function readJsonArray(file) {
  if (!existsSync(file)) return [];
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    failures.push(`${relative(root, file)} is not valid JSON.`);
    return [];
  }
}

function listUploadFiles() {
  if (!existsSync(uploadsDir)) return [];
  return readdirSync(uploadsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name !== '.gitkeep')
    .map((entry) => join(uploadsDir, entry.name));
}

function assertNoSandboxResidue() {
  const documents = readJsonArray(documentsJson);
  const auditLogs = readJsonArray(auditLogsJson);
  const uploadFiles = listUploadFiles();
  const sandboxDocuments = documents.filter((item) => /SANDBOX|HUB-SANDBOX/i.test(JSON.stringify(item)));
  const sandboxAuditLogs = auditLogs.filter((item) => /SANDBOX|HUB-SANDBOX/i.test(JSON.stringify(item)));

  if (uploadFiles.length) {
    failures.push(`apps/api/storage/uploads still contains ${uploadFiles.length} local file(s): ${uploadFiles.map((file) => relative(root, file)).join(', ')}`);
  }
  if (documents.length) {
    failures.push(`apps/api/storage/metadata/documents.json still contains ${documents.length} document record(s). Clean or review them before real-data upload testing.`);
  }
  if (sandboxDocuments.length) {
    failures.push(`documents.json still contains ${sandboxDocuments.length} sandbox record(s).`);
  }
  if (sandboxAuditLogs.length) {
    failures.push(`audit-logs.json still contains ${sandboxAuditLogs.length} sandbox audit record(s).`);
  }

  results.push({
    name: '测试残留清理检查',
    command: 'internal residue scan',
    ok: uploadFiles.length === 0 && documents.length === 0 && sandboxDocuments.length === 0 && sandboxAuditLogs.length === 0,
    elapsedSeconds: '0.0',
  });
}

function writeReport() {
  mkdirSync(dirname(reportPath), { recursive: true });
  const lines = [
    '# 真实资料上传前预检报告',
    '',
    `生成时间：${new Date().toISOString()}`,
    `开始时间：${startedAt.toISOString()}`,
    '',
    '数据库连接或写库操作：否',
    'Sealos 接入：否',
    '企业微信微盘接入：否',
    '真实语音接入：否',
    '',
    '## 检查结果',
    '',
    '| 项目 | 命令 | 结果 | 用时 |',
    '| --- | --- | --- | --- |',
    ...results.map((item) => `| ${item.name} | \`${item.command}\` | ${item.ok ? '通过' : '失败'} | ${item.elapsedSeconds}s |`),
    '',
    '## 结论',
    '',
    failures.length
      ? `未通过，需处理 ${failures.length} 项问题后再上传真实资料。`
      : '通过，可以进入真实资料上传测试。测试后仍需按清理流程确认本地上传文件和 metadata 不会进入 Git。',
    '',
  ];

  if (failures.length) {
    lines.push('## 问题');
    lines.push('');
    for (const failure of failures) lines.push(`- ${failure}`);
    lines.push('');
  }

  writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
}

console.log('真实资料上传前一键预检');
console.log('本脚本只使用本地 Mock API 和合成演示资料，不连接数据库，不执行写库操作。');
console.log('请按顺序执行，不要与其它本地 dev/build/check 命令并行运行。');

for (const command of commands) {
  if (failures.length) break;
  runCommand(command);
}

if (!failures.length) assertNoSandboxResidue();
writeReport();

console.log(`\n预检报告：${resolve(reportPath)}`);

if (failures.length) {
  console.error('\n真实资料上传前预检未通过：');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('\n真实资料上传前预检通过。');
