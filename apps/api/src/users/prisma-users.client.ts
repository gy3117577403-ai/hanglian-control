type PrismaClientLike = {
  $disconnect?: () => Promise<void>;
  user: any;
  [key: string]: any;
};

function getDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value || value.includes('USER:PASSWORD@HOST')) {
    throw new Error(
      'DATABASE_URL is required before auth can use PostgreSQL users.',
    );
  }
  return value;
}

export function createPrismaUsersClient(): PrismaClientLike {
  // Lazy require keeps Nest build independent from a generated Prisma client.
  // Run `npm run prisma:generate` before starting auth against PostgreSQL.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require('../../generated/prisma/client');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaPg } = require('@prisma/adapter-pg');

  const sslMode = process.env.DATABASE_SSL_MODE ?? 'require';
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: getDatabaseUrl(),
      ssl: sslMode === 'require' ? { rejectUnauthorized: false } : undefined,
    }),
  });
}
