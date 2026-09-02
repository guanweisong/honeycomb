import "server-only";

import type {
  UserCommandInput,
  UserCommandPort,
} from "./repository";
import { ApplicationError } from "@/packages/application/errors";
import { UserLevel, type UserStatus } from "@/packages/domain/identity/user";
import type { InProcessEventBus } from "@/packages/domain/events/event-bus";
import { changeUserStatus } from "./user-command-handlers";

export type { UserCommandInput } from "./repository";

export class UserCommandError extends ApplicationError {
  constructor(public readonly code: "FORBIDDEN", message = code) {
    super(code, message);
  }
}

/** 创建用户及凭据。 */
export function createUser(repository: UserCommandPort, input: UserCommandInput) {
  return repository.create(input);
}

/** 删除用户并阻止删除具备用户管理权限的目标。 */
export async function destroyUsers(repository: UserCommandPort, ids: string[]) {
  try {
    return await repository.destroy(ids);
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "FORBIDDEN") {
      throw new UserCommandError("FORBIDDEN");
    }
    throw error;
  }
}

/** 更新用户及可选凭据。 */
export async function updateUser(
  repository: UserCommandPort,
  input: { id: string; password?: string } & Partial<Omit<UserCommandInput, "password">>,
  actorLevel?: UserLevel,
  bus?: InProcessEventBus,
) {
  try {
    if (input.status !== undefined) {
      const current = await repository.getStatus(input.id);
      if (!current) throw new ApplicationError("NOT_FOUND", "用户不存在");
      if (current.status !== input.status) {
        const { id, status, ...changes } = input;
        return changeUserStatus(
          repository,
          {
            id,
            currentStatus: current.status as UserStatus,
            status: status as UserStatus,
            level: current.level as UserLevel,
            actorLevel: actorLevel ?? UserLevel.GUEST,
          },
          bus,
          changes,
        );
      }
    }
    return await repository.update(input);
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "FORBIDDEN") {
      throw new UserCommandError("FORBIDDEN");
    }
    throw error;
  }
}
