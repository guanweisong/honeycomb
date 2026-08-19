import "server-only";

import type {
  UserCommandInput,
  UserRepository,
} from "../infrastructure/user-repository";

export type { UserCommandInput } from "../infrastructure/user-repository";

export class UserCommandError extends Error {
  constructor(public readonly code: "FORBIDDEN", message = code) {
    super(message);
  }
}

/** 创建用户及凭据。 */
export function createUser(repository: UserRepository, input: UserCommandInput) {
  return repository.create(input);
}

/** 删除用户并阻止删除具备用户管理权限的目标。 */
export async function destroyUsers(repository: UserRepository, ids: string[]) {
  try {
    return await repository.destroy(ids);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      throw new UserCommandError("FORBIDDEN");
    }
    throw error;
  }
}

/** 更新用户及可选凭据。 */
export async function updateUser(
  repository: UserRepository,
  input: { id: string; password?: string } & Partial<Omit<UserCommandInput, "password">>,
) {
  try {
    return await repository.update(input);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      throw new UserCommandError("FORBIDDEN");
    }
    throw error;
  }
}
