import "server-only";

import {
  getAdminUser as getApplicationAdminUser,
  type AdminUser,
} from "@/packages/application/identity/admin-user";

export type { AdminUser } from "@/packages/application/identity/admin-user";

export async function getAdminUser(headers: Headers): Promise<AdminUser | null> {
  return getApplicationAdminUser(headers);
}
