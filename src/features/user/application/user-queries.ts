import "server-only";

import type { UserQueryPort } from "./repository";
import { ApplicationError } from "@/packages/application/errors";

export class UserQueryError extends ApplicationError {
  constructor(public readonly code: "UNAUTHORIZED") {
    super(code);
  }
}

/** 查询当前用户。 */
export async function getCurrentUser(
  repository: Pick<UserQueryPort, "current">,
  id: string,
) {
  try {
    return await repository.current(id);
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "UNAUTHORIZED") {
      throw new UserQueryError("UNAUTHORIZED");
    }
    throw error;
  }
}
