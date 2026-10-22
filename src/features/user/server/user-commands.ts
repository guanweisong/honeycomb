import "server-only";

import type { UserCommandInput } from "@/features/user/types/user.insert";
import type { UserUpdateCommandInput } from "@/features/user/types/user.update";
import { ApplicationError } from "@/lib/errors/application-error";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";
import { UserLevel } from "@/features/user/types/user.level";
import {
  assertUserDeletable,
  assertUserLevelChange,
  assertUserStatusChange,
} from "../rules";
import type { UserRepository } from "./user-repository";
import {
  UserInsertSchema,
  UserUpdateSchema,
} from "@/features/user/schema/user.write.schema";

/** 创建用户及凭据。 */
export function createUser(
  repository: Pick<UserRepository, "create">,
  input: UserCommandInput,
  invalidator: PublicContentInvalidator,
) {
  const parsed = UserInsertSchema.parse(input);
  return (async () => {
    const result = await repository.create(parsed);
    const publicSync = await invalidator.invalidate({
      refreshLayout: true,
      refreshPostIndex: true,
    });
    return { ...result, publicSync: publicSync.state };
  })();
}

/** 删除用户，并在写入前保护管理员账号。 */
export async function destroyUsers(
  repository: Pick<UserRepository, "destroy" | "getStates">,
  ids: string[],
  invalidator: PublicContentInvalidator,
) {
  const targets = await repository.getStates(ids);
  for (const target of targets) {
    assertUserDeletable(target.id, target.level);
  }
  const result = await repository.destroy(ids);
  const publicSync = await invalidator.invalidate({
    refreshLayout: true,
    refreshPostIndex: true,
  });
  return { ...result, publicSync: publicSync.state };
}

/** 更新用户及可选凭据。 */
export async function updateUser(
  repository: Pick<UserRepository, "getStatus" | "update">,
  input: UserUpdateCommandInput,
  actorLevel: UserLevel,
  invalidator: PublicContentInvalidator,
) {
  input = UserUpdateSchema.parse(input);
  if (input.status !== undefined || input.level !== undefined) {
    const current = await repository.getStatus(input.id);
    if (!current) throw new ApplicationError("NOT_FOUND", "用户不存在");
    if (input.level !== undefined) {
      assertUserLevelChange(input.id, current.level, input.level);
    }
    if (input.status !== undefined && current.status !== input.status) {
      assertUserStatusChange(input.id, current.level, actorLevel);
    }
  }
  const result = await repository.update(input);
  const publicSync = await invalidator.invalidate({
    refreshLayout: true,
    refreshPostIndex: true,
  });
  return { ...result, publicSync: publicSync.state };
}
