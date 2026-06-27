import { hash } from 'bcryptjs';
import { loadApiEnvironmentFiles } from '../../database/env-loader';
import { createPrismaUsersClient } from '../../users/prisma-users.client';
import type { UserRole } from '../../users/user.types';

const allowedRoles: UserRole[] = [
  'ADMIN',
  'FRONT_LEADER',
  'BACK_LEADER',
  'QUALITY',
  'VIEWER',
];
const defaultTestPassword = 'Admin@123456';

function getAdminRole(): UserRole {
  const value = (process.env.ADMIN_ROLE ?? 'ADMIN').trim() as UserRole;
  if (!allowedRoles.includes(value)) {
    throw new Error(`ADMIN_ROLE must be one of: ${allowedRoles.join(', ')}`);
  }
  return value;
}

function getAdminPassword() {
  const configured = process.env.ADMIN_PASSWORD?.trim();
  if (configured) {
    return { password: configured, source: 'ADMIN_PASSWORD' };
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_PASSWORD is required when NODE_ENV=production.');
  }
  return { password: defaultTestPassword, source: 'development-default' };
}

async function main() {
  loadApiEnvironmentFiles();

  const username = (process.env.ADMIN_USERNAME ?? 'admin').trim();
  const displayName = (process.env.ADMIN_DISPLAY_NAME ?? 'Admin').trim();
  const role = getAdminRole();
  const { password, source } = getAdminPassword();
  const passwordHash = await hash(
    password,
    Number(process.env.AUTH_BCRYPT_ROUNDS ?? 12),
  );
  const client = createPrismaUsersClient();

  try {
    const existing = await client.user.findUnique({ where: { username } });
    const user = existing
      ? await client.user.update({
          where: { username },
          data: {
            displayName: displayName || existing.displayName,
            role,
            passwordHash,
            refreshTokenHash: null,
            isActive: true,
            deletedAt: null,
          },
        })
      : await client.user.create({
          data: {
            username,
            displayName: displayName || username,
            role,
            passwordHash,
            refreshTokenHash: null,
            isActive: true,
          },
        });

    console.log(
      JSON.stringify(
        {
          success: true,
          message: 'Admin user is ready.',
          passwordSource: source,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            role: user.role,
            isActive: user.isActive,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await client.$disconnect?.();
  }
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        success: false,
        message: 'Admin seed failed.',
        reason: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
