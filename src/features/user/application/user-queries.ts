import "server-only";

import type {
  UserListInput,
  UserQueryPort,
} from "./repository";
import { ApplicationError } from "@/packages/application/errors";

export type { UserListInput } from "./repository";

export class UserQueryError extends ApplicationError {
  constructor(public readonly code: "UNAUTHORIZED") {
    super(code);
  }
}

/** 查询用户详情。 */
export function getUserDetail(repository: UserQueryPort, id: string) {
  return repository.detail(id);
}

/** 查询当前用户。 */
export async function getCurrentUser(repository: UserQueryPort, id: string) {
  try {
    return await repository.current(id);
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "UNAUTHORIZED") {
      throw new UserQueryError("UNAUTHORIZED");
    }
    throw error;
  }
}

/** 查询用户列表。 */
export function getUserList(repository: UserQueryPort, input: UserListInput) {
  return repository.list(input);
}
