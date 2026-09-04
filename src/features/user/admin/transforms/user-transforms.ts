import type { UserUpdate } from "@/features/user/schemas/user.update.schema";
import type { UserViewModel as UserEntity } from "../../presentation/user-view-model";
import { UserStatus } from "@/packages/domain/identity/user";
import { isProtectedUser } from "../../domain/user";

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
  return record ? isProtectedUser(record.level) : false;
}

export function canDeleteUserResource(record: UserEntity): boolean {
  return (
    !isUserResourceProtected(record) && record.status !== UserStatus.DELETED
  );
}
/**
 * 用户表单、更新输入和资源删除权限的数据转换函数。
 */
