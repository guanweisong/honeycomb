import "server-only";
import { auth } from "@/auth";
import { isUserEnabled } from "../rules";
import { ApplicationError } from "@/lib/errors/application-error";
import type { UserRepository } from "./user-repository";
import type { AdminUser } from "../types/user.current";

/** 从当前请求会话读取可进入 Admin 的启用用户。 */
export async function getAdminUser(
  headers: Headers,
  repository: Pick<UserRepository, "current">,
): Promise<AdminUser | null> {
  const session = await auth.api.getSession({ headers });
  const sessionUser = session?.user;

  if (!sessionUser?.id) return null;

  let user;
  try {
    user = await repository.current(sessionUser.id);
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "UNAUTHORIZED")
      return null;
    throw error;
  }
  if (!user || !isUserEnabled(user.status)) return null;

  return user;
}
