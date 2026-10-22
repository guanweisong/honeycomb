import type { UserUpdate } from "@/features/user/types/user.update";
import type { UserRecord as UserEntity } from "@/features/user/types/user.record";
import { UserStatus } from "@/features/user/types/user.status";
import { isProtectedUser } from "../../rules";

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

export function isUserResourceProtected(record?: UserEntity): boolean {
  return record ? isProtectedUser(record.level) : false;
}

export function canDeleteUserResource(record: UserEntity): boolean {
  return (
    !isUserResourceProtected(record) && record.status !== UserStatus.DELETED
  );
}
/**
 * 用户表单和资源删除权限的数据转换函数。
 */
