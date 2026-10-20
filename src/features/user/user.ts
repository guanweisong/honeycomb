export enum UserLevel {
  ADMIN = "ADMIN",
  EDITOR = "EDITOR",
  GUEST = "GUEST",
}

export interface CurrentUser {
  id: string;
  name?: string | null;
  level: UserLevel;
}

export enum UserStatus {
  DELETED = "DELETED",
  ENABLE = "ENABLE",
  DISABLE = "DISABLE",
}

export function isUserEnabled(status: UserStatus): boolean {
  return status === UserStatus.ENABLE;
}
