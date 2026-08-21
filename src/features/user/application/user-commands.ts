import "server-only";

import type {
  UserCommandInput,
  UserCommandPort,
} from "./repository";
import { ApplicationError } from "@/packages/application/errors";

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
) {
  try {
    return await repository.update(input);
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "FORBIDDEN") {
      throw new UserCommandError("FORBIDDEN");
    }
    throw error;
  }
}
