export type UserRole =
  | 'ADMIN'
  | 'FRONT_LEADER'
  | 'BACK_LEADER'
  | 'QUALITY'
  | 'VIEWER';

export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  passwordHash?: string | null;
  refreshTokenHash?: string | null;
  role: UserRole | string;
  teamName?: string | null;
  isActive: boolean;
  lastLoginAt?: Date | null;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole | string;
  teamName: string | null;
  isActive: boolean;
}

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    teamName: user.teamName ?? null,
    isActive: user.isActive,
  };
}
