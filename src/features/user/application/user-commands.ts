import "server-only";

import type {
  UserCommandInput,
  UserCommandPort,
} from "./repository";
import { ApplicationError } from "@/packages/application/errors";
import { UserLevel } from "@/packages/domain/identity/user";
import type { InProcessEventBus } from "@/packages/domain/events/event-bus";
import { changeUserStatus } from "./user-command-handlers";
import { UserAggregate } from "../domain/user";

export type { UserCommandInput } from "./repository";

/** 创建用户及凭据。 */
export function createUser(repository: Pick<UserCommandPort, "create">, input: UserCommandInput) {
  return repository.create(input);
}

/** 删除用户，并由领域模型阻止删除受保护的管理员账号。 */
export async function destroyUsers(
  repository: Pick<UserCommandPort, "destroy" | "getStates">,
  ids: string[],
) {
  const targets = await repository.getStates(ids);
  for (const target of targets) {
    UserAggregate.rehydrate(
      target.id,
      target.status,
      target.level,
    ).assertDeletable();
  }
  return repository.destroy(ids);
}

/** 更新用户及可选凭据。 */
export async function updateUser(
  repository: Pick<UserCommandPort, "getStatus" | "update">,
  input: { id: string; password?: string } & Partial<Omit<UserCommandInput, "password">>,
  actorLevel: UserLevel,
  bus?: InProcessEventBus,
) {
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
      return changeUserStatus(
        repository,
        {
          id,
          currentStatus: current.status,
          status,
          level: current.level,
          actorLevel,
        },
        bus,
        changes,
      );
    }
  }
  return repository.update(input);
}
