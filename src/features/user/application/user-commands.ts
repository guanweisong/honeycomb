import "server-only";

import type {
  UserCommandInput,
  UserCommandPort,
  UserUpdateCommandInput,
} from "./repository";
import { ApplicationError } from "@/packages/application/errors";
import type { PublicContentInvalidator } from "@/packages/application/public-content-invalidator";
import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import { UserAggregate } from "../domain/user";
import { UserInsertSchema, UserUpdateSchema } from "./write-schema";

export type { UserCommandInput } from "./repository";

/** 创建用户及凭据。 */
export function createUser(
  repository: Pick<UserCommandPort, "create">,
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

/** 删除用户，并由领域模型阻止删除受保护的管理员账号。 */
export async function destroyUsers(
  repository: Pick<UserCommandPort, "destroy" | "getStates">,
  ids: string[],
  invalidator: PublicContentInvalidator,
) {
  const targets = await repository.getStates(ids);
  for (const target of targets) {
    UserAggregate.rehydrate(
      target.id,
      target.status,
      target.level,
    ).assertDeletable();
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
  repository: Pick<UserCommandPort, "getStatus" | "update">,
  input: UserUpdateCommandInput,
  actorLevel: UserLevel,
  invalidator: PublicContentInvalidator,
) {
  input = UserUpdateSchema.parse(input);
  if (input.status !== undefined || input.level !== undefined) {
    const current = await repository.getStatus(input.id);
    if (!current) throw new ApplicationError("NOT_FOUND", "用户不存在");
    const aggregate = UserAggregate.rehydrate(
      input.id,
      current.status,
      current.level,
    );
    if (input.level !== undefined) aggregate.changeLevel(input.level);
    if (input.status !== undefined && current.status !== input.status) {
      const { id, status, ...changes } = input;
      const result = await changeUserStatus(
        repository,
        {
          id,
          currentStatus: current.status,
          status,
          level: current.level,
          actorLevel,
        },
        changes,
      );
      const publicSync = await invalidator.invalidate({
        refreshLayout: true,
        refreshPostIndex: true,
      });
      return { ...result, publicSync: publicSync.state };
    }
  }
  const result = await repository.update(input);
  const publicSync = await invalidator.invalidate({
    refreshLayout: true,
    refreshPostIndex: true,
  });
  return { ...result, publicSync: publicSync.state };
}

type UserStatusChangeInput = {
  id: string;
  currentStatus: UserStatus;
  status: UserStatus;
  level: UserLevel;
  actorLevel: UserLevel;
};

type UserUpdateFields = {
  password?: string;
} & Partial<Omit<UserCommandInput, "password" | "status">>;

export async function changeUserStatus(
  repository: Pick<UserCommandPort, "update">,
  input: UserStatusChangeInput,
  changes?: UserUpdateFields,
) {
  const aggregate = UserAggregate.rehydrate(
    input.id,
    input.currentStatus,
    input.level,
  );
  aggregate.changeStatus(input.status, input.actorLevel);
  return repository.update({ id: input.id, ...changes, status: input.status });
}
