import "server-only";

import {
  getAdminUser as getApplicationAdminUser,
  type AdminUser,
} from "@/features/user/application/admin-user";

export type { AdminUser } from "@/features/user/application/admin-user";

export async function getAdminUser(headers: Headers): Promise<AdminUser | null> {
  return getApplicationAdminUser(headers);
}
