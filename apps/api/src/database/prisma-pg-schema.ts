export type PrismaPgConstructor = new (
  poolOrConfig: { connectionString: string; options?: string } | string,
  options?: { schema?: string },
) => unknown;

export interface PrismaPgSchemaRoute {
  database: string;
  schema: string;
}

export function assertSafePostgresIdentifier(value: string, label = 'schema') {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid PostgreSQL ${label} identifier.`);
  }
}

export function getDatabaseSchemaRoute(databaseUrl: string): PrismaPgSchemaRoute {
  const url = new URL(databaseUrl);
  const schema = (url.searchParams.get('schema') ?? 'public').trim() || 'public';
  assertSafePostgresIdentifier(schema, 'schema');
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!database) throw new Error('DATABASE_URL database name is missing.');
  return { database, schema };
}

export function createSchemaAwarePrismaPgAdapter(PrismaPg: PrismaPgConstructor, databaseUrl: string) {
  const route = getDatabaseSchemaRoute(databaseUrl);
  return {
    route,
    adapter: new PrismaPg(
      {
        connectionString: databaseUrl,
        options: `-c search_path=${route.schema}`,
      },
      { schema: route.schema },
    ),
  };
}

export async function assertPrismaSchemaRoute(
  prisma: { $queryRawUnsafe?: (query: string) => Promise<Array<Record<string, unknown>>> },
  expectedRoute: PrismaPgSchemaRoute,
) {
  if (typeof prisma.$queryRawUnsafe !== 'function') {
    throw new Error('PrismaClient is missing $queryRawUnsafe for schema route assertion.');
  }
  const rows = await prisma.$queryRawUnsafe(
    "SELECT current_database() AS database, current_schema() AS schema, current_setting('search_path') AS search_path",
  );
  const row = rows[0] ?? {};
  const actualDatabase = String(row.database ?? '');
  const actualSchema = String(row.schema ?? '');
  const searchPath = String(row.search_path ?? '');
  if (actualDatabase !== expectedRoute.database) {
    throw new Error('PrismaPg connected to an unexpected database.');
  }
  if (actualSchema !== expectedRoute.schema) {
    throw new Error('PrismaPg current_schema does not match DATABASE_URL schema.');
  }
  if (!searchPath.includes(expectedRoute.schema)) {
    throw new Error('PrismaPg search_path does not include DATABASE_URL schema.');
  }
  return { database: actualDatabase, schema: actualSchema, searchPath };
}
