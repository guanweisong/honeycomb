import "server-only";
import { cache } from "react";
import { headers } from "next/headers";

import {
  getAdminUser as getApplicationAdminUser,
  type AdminUser,
} from "@/features/user/admin-user";
import { createUserRepository } from "@/features/user/infrastructure/user-repository";
import { getDb } from "@/packages/infrastructure/db/db";

export type { AdminUser } from "@/features/user/admin-user";

export async function getAdminUser(
  headers: Headers,
): Promise<AdminUser | null> {
  return getApplicationAdminUser(headers, createUserRepository(getDb()));
}

/** 同一服务端渲染共享身份读取；React 在下一次请求时清空缓存。 */
export const getCurrentAdminUser = cache(async (): Promise<AdminUser | null> =>
  getAdminUser(await headers()),
);
