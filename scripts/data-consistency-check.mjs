import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];
const items = [];

function safeRead(relativePath, fallback) {
  const file = join(root, relativePath);
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    warnings.push(`${relativePath} 不是有效 JSON，已跳过。`);
    return fallback;
  }
}

function add(label, ok, message, level = 'error') {
  items.push({ label, status: ok ? '通过' : level === 'warning' ? '提醒' : '失败', message });
  if (ok) return;
  if (level === 'warning') warnings.push(`${label}：${message}`);
  else errors.push(`${label}：${message}`);
}

const seedText = existsSync(join(root, 'apps/api/src/mock/seed-v0.3.ts'))
  ? readFileSync(join(root, 'apps/api/src/mock/seed-v0.3.ts'), 'utf8')
  : '';
const documents = safeRead('apps/api/storage/metadata/documents.json', []);
const auditLogs = safeRead('apps/api/storage/metadata/audit-logs.json', []);
const importRecords = safeRead('apps/api/storage/metadata/import-records.json', []);
const maintenanceRecords = safeRead('apps/api/storage/metadata/maintenance-records.json', []);
const executionRecords = safeRead('apps/api/storage/metadata/execution-records.json', []);
const quantityReports = safeRead('apps/api/storage/metadata/quantity-reports.json', []);
const fixtures = safeRead('apps/api/storage/metadata/knowledge-fixtures.json', []);
const abnormalCases = safeRead('apps/api/storage/metadata/knowledge-abnormal-cases.json', []);
const qualityStandards = safeRead('apps/api/storage/metadata/knowledge-quality-standards.json', []);

add('Mock seed 存在', Boolean(seedText), 'apps/api/src/mock/seed-v0.3.ts 可读取');
add('生产计划包含 productId', seedText.includes('productId'), 'Mock seed 中包含 productId 字段');
add('产品包含 customerId', seedText.includes('customerId'), 'Mock seed 中包含 customerId 字段');
add('前段参数包含 productId', seedText.includes('frontProcessParameters') && seedText.includes('terminalModel'), '前段参数 seed 可识别');
add('后段资料包包含 productId', seedText.includes('backProcessPackages') && seedText.includes('connectorModel'), '后段资料包 seed 可识别');

const manualWithoutFile = documents.filter((document) => document.source === 'manual_upload' && !document.storedFileName);
add('本地上传资料 storedFileName', manualWithoutFile.length === 0, manualWithoutFile.length ? `${manualWithoutFile.length} 条本地上传资料缺少 storedFileName` : '本地上传资料文件名完整', 'warning');

const auditWithoutOperator = auditLogs.filter((log) => !log.operatorId && !log.operatorName);
add('审计记录 operator', auditWithoutOperator.length === 0, auditWithoutOperator.length ? `${auditWithoutOperator.length} 条审计记录缺少 operator` : '审计记录操作人可追溯', 'warning');

const maintenanceWithoutEntity = maintenanceRecords.filter((record) => !record.entityId);
add('维护记录 entityId', maintenanceWithoutEntity.length === 0, maintenanceWithoutEntity.length ? `${maintenanceWithoutEntity.length} 条维护记录缺少 entityId` : '维护记录实体可追溯', 'warning');

const importsWithoutType = importRecords.filter((record) => !record.importType);
add('导入记录 importType', importsWithoutType.length === 0, importsWithoutType.length ? `${importsWithoutType.length} 条导入记录缺少 importType` : '导入记录类型完整', 'warning');

const executionWithoutPlan = executionRecords.filter((record) => !record.planId);
add('执行记录 planId', executionWithoutPlan.length === 0, executionWithoutPlan.length ? `${executionWithoutPlan.length} 条执行记录缺少 planId` : '执行记录计划关联完整', 'warning');

const quantityWithoutPlan = quantityReports.filter((record) => !record.planId);
add('数量报工 planId', quantityWithoutPlan.length === 0, quantityWithoutPlan.length ? `${quantityWithoutPlan.length} 条报工记录缺少 planId` : '数量报工计划关联完整', 'warning');

const knowledgeRows = [...fixtures, ...abnormalCases, ...qualityStandards];
const knowledgeWithoutProduct = knowledgeRows.filter((row) => !row.productId && !row.productCode);
add('知识库产品关联', knowledgeWithoutProduct.length === 0, knowledgeWithoutProduct.length ? `${knowledgeWithoutProduct.length} 条知识库记录缺少产品线索` : '知识库记录具备产品或通用线索', 'warning');

const score = Math.max(0, 100 - errors.length * 8 - warnings.length * 2);

console.log('V2.7 数据一致性检查报告');
console.log('该脚本只读，不连接数据库，不写库，不删除文件，不打印敏感路径。');
console.log(`得分：${score}`);
console.log(`通过项：${items.filter((item) => item.status === '通过').length}`);
console.log(`提醒项：${warnings.length}`);
console.log(`失败项：${errors.length}`);

if (warnings.length) {
  console.log('\n提醒项：');
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (errors.length) {
  console.log('\n失败项：');
  for (const error of errors) console.log(`- ${error}`);
  process.exit(1);
}

console.log('\n数据一致性检查通过。');
