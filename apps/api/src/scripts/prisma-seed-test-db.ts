import {
  assertDatabaseWriteAllowed,
  assertNotProductionDatabase,
  getDatabaseSafetyStatus,
} from '../database/database-safety';
import { buildPrismaSeedPreview } from '../migration/migration-dry-run';

async function main() {
  const safety = getDatabaseSafetyStatus();
  assertNotProductionDatabase();
  assertDatabaseWriteAllowed();

  if (process.env.SEED_MODE !== 'test-db') {
    throw new Error('SEED_MODE 不是 test-db，拒绝执行测试库 seed。');
  }

  const preview = buildPrismaSeedPreview();
  if (preview.errors.length > 0) {
    throw new Error(`seed 数据校验失败：${preview.errors.join('；')}`);
  }

  console.log(JSON.stringify({
    message: 'V0.7 仅提供测试库 seed 安全入口草案，未在本阶段自动执行写库。',
    safety,
    summary: preview.summary,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({
    message: '已阻止测试库 seed 执行。',
    reason: error instanceof Error ? error.message : String(error),
    safety: getDatabaseSafetyStatus(),
  }, null, 2));
  process.exitCode = 1;
});
