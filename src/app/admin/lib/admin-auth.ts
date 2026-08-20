import "server-only";

import {
  getAdminUser as getApplicationAdminUser,
  type AdminUser,
} from "@/features/user/admin-user";
import { createUserRepository } from "@/features/user/infrastructure/user-repository";
import { getDb } from "@/packages/infrastructure/db/db";

export type { AdminUser } from "@/features/user/admin-user";

export async function getAdminUser(headers: Headers): Promise<AdminUser | null> {
  return getApplicationAdminUser(headers, createUserRepository(getDb()));
}
