import "server-only";

import type { UserCommandInput } from "@/features/user/types/user.insert";
import type { UserUpdateCommandInput } from "@/features/user/types/user.update";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";
import { UserLevel } from "@/features/user/types/user.level";
import type { UserRepository } from "@/features/user/server/user-repository";
import {
  UserInsertSchema,
  UserUpdateSchema,
} from "@/features/user/schemas/user.write.schema";

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
  repository: Pick<UserRepository, "destroy">,
  ids: string[],
  invalidator: PublicContentInvalidator,
) {
  const result = await repository.destroy(ids);
  const publicSync = await invalidator.invalidate({
    refreshLayout: true,
    refreshPageDetails: true,
    refreshPostDetails: true,
    refreshPostIndex: true,
  });
  return { ...result, publicSync: publicSync.state };
}

/** 更新用户及可选凭据。 */
export async function updateUser(
  repository: Pick<UserRepository, "update">,
  input: UserUpdateCommandInput,
  actorLevel: UserLevel,
  invalidator: PublicContentInvalidator,
) {
  input = UserUpdateSchema.parse(input);
  const result = await repository.update(input, actorLevel);
  const publicSync = await invalidator.invalidate({
    refreshLayout: true,
    refreshPageDetails: true,
    refreshPostDetails: true,
    refreshPostIndex: true,
  });
  return { ...result, publicSync: publicSync.state };
}
