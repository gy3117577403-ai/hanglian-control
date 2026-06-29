import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const appConfigPath = path.join(repoRoot, 'harmony-pad/entry/src/main/ets/services/AppConfig.ets');
const pagesDir = path.join(repoRoot, 'harmony-pad/entry/src/main/ets/pages');
const componentsDir = path.join(repoRoot, 'harmony-pad/entry/src/main/ets/components');
const mainPagesPath = path.join(repoRoot, 'harmony-pad/entry/src/main/resources/base/profile/main_pages.json');
const reportsDir = path.join(repoRoot, 'reports');
const jsonReportPath = path.join(reportsDir, 'harmony-field-regression.json');
const mdReportPath = path.join(reportsDir, 'harmony-field-regression.md');

const results = [];

function addCheck(name, passed, details = '') {
  results.push({
    name,
    passed,
    details
  });
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const output = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      output.push(...walk(fullPath));
    } else if (item.isFile() && fullPath.endsWith('.ets')) {
      output.push(fullPath);
    }
  }
  return output;
}

function rel(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}

function extractUiStrings(content) {
  const strings = [];
  const patterns = [
    /\b(?:Text|Button)\(\s*(['"`])([\s\S]*?)\1/g,
    /placeholder\s*:\s*(['"`])([\s\S]*?)\1/g,
    /@State\s+private\s+(?:statusText|statusMessage|uploadStatus|selectedFileName|title)\s*:\s*string\s*=\s*(['"`])([\s\S]*?)\1/g,
    /\b(?:this\.)?(?:statusText|statusMessage|uploadStatus|selectedFileName|title)\s*=\s*(['"`])([\s\S]*?)\1/g
  ];

  for (const pattern of patterns) {
    let match = pattern.exec(content);
    while (match) {
      strings.push(match[2]);
      match = pattern.exec(content);
    }
  }
  return strings;
}

function checkAppConfig() {
  const content = read(appConfigPath);
  const baseOk = content.includes("static readonly API_BASE_URL: string = 'https://fyeboolnlvqv.sealoshzh.site/api';");
  const prefixOk = content.includes("static readonly API_PREFIX: string = '';");
  addCheck('AppConfig API_BASE_URL 保持 Sealos /api 地址', baseOk, baseOk ? '' : rel(appConfigPath));
  addCheck('AppConfig API_PREFIX 为空', prefixOk, prefixOk ? '' : rel(appConfigPath));
}

function checkForbiddenUiText() {
  const forbidden = [
    'productId:',
    'documentId:',
    'category:',
    'documentType:',
    'file://',
    'internal://',
    'API:',
    'tapCount',
    'lastAction',
    'errorText',
    'Http protocol error',
    'raw JSON',
    'HANG LIAN INDEX OK',
    'BootCheckPage',
    'smoke',
    'debug'
  ];
  const files = [...walk(pagesDir), ...walk(componentsDir)];
  const hits = [];
  for (const file of files) {
    const strings = extractUiStrings(read(file));
    for (const value of strings) {
      for (const word of forbidden) {
        if (value.toLowerCase().includes(word.toLowerCase())) {
          hits.push(`${rel(file)} -> ${word}`);
        }
      }
    }
  }
  addCheck('UI 文案不显示调试字段', hits.length === 0, hits.join('\n'));
}

function checkMainPages() {
  const required = [
    'pages/LoginPage',
    'pages/WorkbenchPage',
    'pages/DocumentUploadPage',
    'pages/DocumentPreviewPage',
    'pages/CustomerProductPage',
    'pages/ConnectorParamPage',
    'pages/RecycleBinPage',
    'pages/OrderOverviewPage',
    'pages/TestLabPage'
  ];
  const content = read(mainPagesPath);
  const missing = required.filter((item) => !content.includes(`"${item}"`));
  addCheck('main_pages.json 包含现场页面', missing.length === 0, missing.join(', '));
}

function checkReturnWorkbenchButtons() {
  const required = [
    'CustomerProductPage.ets',
    'ConnectorParamPage.ets',
    'RecycleBinPage.ets',
    'OrderOverviewPage.ets',
    'DocumentUploadPage.ets',
    'DocumentPreviewPage.ets',
    'TestLabPage.ets'
  ];
  const missing = [];
  for (const fileName of required) {
    const filePath = path.join(pagesDir, fileName);
    if (!fs.existsSync(filePath) || !read(filePath).includes("Button('返回工作台'")) {
      missing.push(fileName);
    }
  }
  addCheck('业务页面均有返回工作台按钮', missing.length === 0, missing.join(', '));
}

function checkApiPrefixes() {
  const files = walk(path.join(repoRoot, 'harmony-pad/entry/src/main/ets'));
  const pattern = /\/api\/(?:auth|products|documents|connector-params|recycle-bin)/;
  const hits = [];
  for (const file of files) {
    if (pattern.test(read(file))) {
      hits.push(rel(file));
    }
  }
  addCheck('ArkTS API 路径未重复写 /api 前缀', hits.length === 0, hits.join('\n'));
}

function checkRecycleBinSafety() {
  const file = path.join(pagesDir, 'RecycleBinPage.ets');
  const content = read(file);
  const issues = [];
  if (/\.forEach\s*\(/.test(content)) issues.push('RecycleBinPage 使用 array.forEach');
  if (/ForEach\s*\(\s*undefined/.test(content)) issues.push('RecycleBinPage 使用 ForEach(undefined)');
  if (/ForEach\s*\([^,\n]+,\s*this\./.test(content)) issues.push('RecycleBinPage 使用 this 方法引用作为 ForEach itemGenerator');
  if (!content.includes('@State private recycleItems: RecycleBinItem[] = []')) issues.push('RecycleBinPage 未使用 recycleItems 空数组初始化');
  addCheck('RecycleBinPage 列表渲染安全', issues.length === 0, issues.join('\n'));
}

function checkWorkbenchGrid() {
  const files = [
    path.join(pagesDir, 'WorkbenchPage.ets'),
    path.join(componentsDir, 'DocumentCategoryGrid.ets')
  ];
  const hits = files.filter((file) => fs.existsSync(file) && /\bGrid\s*\(/.test(read(file))).map(rel);
  addCheck('Workbench 主交互区域不使用 Grid', hits.length === 0, hits.join('\n'));
}

function writeReports() {
  fs.mkdirSync(reportsDir, { recursive: true });
  const failed = results.filter((item) => !item.passed);
  const report = {
    generatedAt: new Date().toISOString(),
    passed: failed.length === 0,
    total: results.length,
    failed: failed.length,
    results
  };
  fs.writeFileSync(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const lines = [
    '# Harmony Field Regression',
    '',
    `- 结果：${report.passed ? '通过' : '失败'}`,
    `- 检查项：${report.total}`,
    `- 失败项：${report.failed}`,
    '',
    '| 检查项 | 结果 | 说明 |',
    '| --- | --- | --- |'
  ];
  for (const item of results) {
    lines.push(`| ${item.name} | ${item.passed ? '通过' : '失败'} | ${(item.details || '-').replace(/\n/g, '<br>')} |`);
  }
  fs.writeFileSync(mdReportPath, `${lines.join('\n')}\n`, 'utf8');
}

checkAppConfig();
checkForbiddenUiText();
checkMainPages();
checkReturnWorkbenchButtons();
checkApiPrefixes();
checkRecycleBinSafety();
checkWorkbenchGrid();
writeReports();

const failed = results.filter((item) => !item.passed);
for (const item of results) {
  console.log(`${item.passed ? 'PASS' : 'FAIL'} ${item.name}${item.details ? `\n${item.details}` : ''}`);
}

if (failed.length > 0) {
  process.exitCode = 1;
}
