import { Permission, can } from "@/packages/auth/permissions";
import type { UserUpdate } from "@/packages/trpc/api/modules/user/schemas/user.update.schema";
import type { UserEntity } from "@/packages/trpc/api/modules/user/types/user.entity";
import { UserStatus } from "@/packages/trpc/api/modules/user/types/user.status";

export function toUserFormDefaults(
  record?: UserEntity,
): Partial<UserUpdate> | undefined {
  if (!record) return undefined;

  return {
    id: record.id,
    name: record.name ?? undefined,
    email: record.email ?? undefined,
    level: record.level,
    status: record.status,
  };
}

export function buildUserUpdateInput(
  record: UserEntity,
  values: UserUpdate,
): UserUpdate {
  return { ...values, id: record.id };
}

export function isUserResourceProtected(record?: UserEntity): boolean {
  return can(record?.level, Permission.userManage);
}

export function canDeleteUserResource(record: UserEntity): boolean {
  return (
    !isUserResourceProtected(record) && record.status !== UserStatus.DELETED
  );
}
