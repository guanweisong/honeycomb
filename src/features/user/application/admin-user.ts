import "server-only";

import { auth } from "@/auth";
import { UserStatus, type CurrentUser, type UserLevel } from "@/packages/domain/identity/user";
import { getDb } from "@/packages/infrastructure/db/db";
import { getCurrentUser, UserQueryError } from "./user-queries";

export interface AdminUser extends CurrentUser {
  id: string;
  level: UserLevel;
  email: string | null;
  status: UserStatus;
  name: string | null;
}

/** 从当前请求会话读取可进入 Admin 的启用用户。 */
export async function getAdminUser(headers: Headers): Promise<AdminUser | null> {
  const session = await auth.api.getSession({ headers });
  const sessionUser = session?.user as { id?: string } | null | undefined;

  if (!sessionUser?.id) return null;

  let user;
  try {
    user = await getCurrentUser(getDb(), sessionUser.id);
  } catch (error) {
    if (error instanceof UserQueryError) return null;
    throw error;
  }
  if (!user || user.status !== UserStatus.ENABLE) return null;

  return user;
}
