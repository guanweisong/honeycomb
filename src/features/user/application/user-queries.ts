import "server-only";

import type {
  UserListInput,
  UserRepository,
} from "../infrastructure/user-repository";

export type { UserListInput } from "../infrastructure/user-repository";

export class UserQueryError extends Error {
  constructor(public readonly code: "UNAUTHORIZED") {
    super(code);
  }
}

/** 查询用户详情。 */
export function getUserDetail(repository: UserRepository, id: string) {
  return repository.detail(id);
}

/** 查询当前用户。 */
export async function getCurrentUser(repository: UserRepository, id: string) {
  try {
    return await repository.current(id);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      throw new UserQueryError("UNAUTHORIZED");
    }
    throw error;
  }
}

/** 查询用户列表。 */
export function getUserList(repository: UserRepository, input: UserListInput) {
  return repository.list(input);
}
