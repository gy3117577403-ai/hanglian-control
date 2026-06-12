import { Pool } from 'pg';
import { getDatabaseSafetyStatus, assertReadOnlyDatabaseCheckAllowed } from '../database/database-safety';
import { loadApiEnvironmentFiles } from '../database/env-loader';

loadApiEnvironmentFiles();

function versionSummary(version?: string) {
  return version?.split(' on ')[0] ?? '未知';
}

async function main() {
  const safety = getDatabaseSafetyStatus();

  if (!safety.canReadDatabase) {
    console.log(JSON.stringify({
      success: false,
      skipped: true,
      message: '未满足 Sealos PostgreSQL 测试库只读检查条件，已安全退出；未连接数据库。',
      safety,
    }, null, 2));
    return;
  }

  assertReadOnlyDatabaseCheckAllowed();

  const timeoutSeconds = Number(process.env.DATABASE_CONNECT_TIMEOUT_SECONDS ?? 10);
  const sslMode = process.env.DATABASE_SSL_MODE ?? 'require';
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: Math.max(timeoutSeconds, 1) * 1000,
    ssl: sslMode === 'require' ? { rejectUnauthorized: false } : undefined,
    max: 1,
  });

  try {
    const ok = await pool.query<{ ok: number }>('SELECT 1 AS ok');
    const database = await pool.query<{ current_database: string }>('SELECT current_database()');
    const schema = await pool.query<{ current_schema: string }>('SELECT current_schema()');
    const version = await pool.query<{ version: string }>('SELECT version()');

    console.log(JSON.stringify({
      success: ok.rows[0]?.ok === 1,
      message: 'Sealos PostgreSQL 测试库只读连接检查成功；未执行任何写入 SQL。',
      databaseUrlMasked: safety.databaseUrlMasked,
      currentDatabase: database.rows[0]?.current_database,
      currentSchema: schema.rows[0]?.current_schema,
      postgresqlVersion: versionSummary(version.rows[0]?.version),
      canWriteDatabase: false,
      destructiveActionsAllowed: false,
      executedSql: [
        'SELECT 1 AS ok',
        'SELECT current_database()',
        'SELECT current_schema()',
        'SELECT version()',
      ],
    }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({
    success: false,
    message: '只读连接检查失败；未执行任何写入 SQL。',
    reason: error instanceof Error ? error.message : String(error),
    safety: getDatabaseSafetyStatus(),
  }, null, 2));
  process.exitCode = 1;
});
