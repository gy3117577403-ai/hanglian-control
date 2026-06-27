DO $$
BEGIN
  CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'FRONT_LEADER', 'BACK_LEADER', 'QUALITY', 'VIEWER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL AND to_regclass('public."User"') IS NOT NULL THEN
    ALTER TABLE "User" RENAME TO "users";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "passwordHash" TEXT,
  "refreshTokenHash" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
  "teamName" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "refreshTokenHash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");
