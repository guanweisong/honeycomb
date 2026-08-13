import "server-only";

import { auth } from "@/auth";
import { getDb } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { UserStatus, type CurrentUser } from "@/packages/domain/identity/user";
import { UserLevel } from "@/packages/domain/identity/user";
import { eq } from "drizzle-orm";

export interface AdminUser extends CurrentUser {
  id: string;
  level: UserLevel;
  email: string | null;
  status: UserStatus;
  name: string | null;
}

export async function getAdminUser(headers: Headers): Promise<AdminUser | null> {
  const session = await auth.api.getSession({ headers });
  const sessionUser = session?.user as { id?: string } | null | undefined;

  if (!sessionUser?.id) {
    return null;
  }

  const db = getDb();
  const [user] = await db
    .select({
      id: schema.user.id,
      email: schema.user.email,
      level: schema.user.level,
      name: schema.user.name,
      status: schema.user.status,
    })
    .from(schema.user)
    .where(eq(schema.user.id, sessionUser.id))
    .limit(1);

  if (!user || user.status !== UserStatus.ENABLE) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    level: user.level,
    name: user.name,
    status: user.status,
  };
}
