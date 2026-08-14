import "server-only";

import { eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/trpc/api/utils/tools";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { can, Permission } from "@/packages/identity/auth/permissions";
import { TRPCError } from "@trpc/server";
import {
  setCredentialPassword,
  type CredentialStore,
} from "@/packages/identity/auth/credentials";
import type { UserListQueryInput } from "./schemas/user.list.query.schema";

const safeUserColumns = {
  id: schema.user.id,
  email: schema.user.email,
  level: schema.user.level,
  name: schema.user.name,
  status: schema.user.status,
  createdAt: schema.user.createdAt,
  updatedAt: schema.user.updatedAt,
};

/** 查询用户详情。 */
export async function getUserDetail(db: Database, id: string) {
  const [user] = await observeDbOperation("user.detail", "select", () =>
    db
      .select({ id: schema.user.id, name: schema.user.name })
      .from(schema.user)
      .where(eq(schema.user.id, id))
      .limit(1),
  );
  return user ?? null;
}
/** 查询当前用户。 */
export async function getCurrentUser(db: Database, id: string) {
  const [user] = await observeDbOperation("user.current", "select", () =>
    db
      .select({
        id: schema.user.id,
        email: schema.user.email,
        level: schema.user.level,
        name: schema.user.name,
        status: schema.user.status,
      })
      .from(schema.user)
      .where(eq(schema.user.id, id))
      .limit(1),
  );
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return user;
}
/** 查询用户列表。 */
export async function getUserList(db: Database, input: UserListQueryInput) {
  const { page = 1, limit = 10, sortField, sortOrder, ...rest } = input;
  const where = buildDrizzleWhere(schema.user, rest, ["status", "level"]);
  const orderBy = buildDrizzleOrderBy(
    schema.user,
    sortField,
    sortOrder as "asc" | "desc",
    "createdAt",
  );
  const [list, counts] = await Promise.all([
    observeDbOperation("user.list", "select", () =>
      db
        .select(safeUserColumns)
        .from(schema.user)
        .where(where)
        .orderBy(orderBy)
        .limit(limit)
        .offset((page - 1) * limit),
    ),
    observeDbOperation("user.count", "select", () =>
      db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.user)
        .where(where),
    ),
  ]);
  return { list, total: Number(counts[0]?.count) || 0 };
}
/** 创建用户及凭据。 */
export async function createUser(db: Database, input: Record<string, unknown>) {
  const { password, ...values } = input;
  return db.transaction(async (tx) => {
    const [user] = await observeDbOperation("user.create", "insert", () =>
      tx
        .insert(schema.user)
        .values(values as typeof schema.user.$inferInsert)
        .returning(safeUserColumns),
    );
    await setCredentialPassword(tx, user.id, password as string);
    return user;
  });
}
/** 删除用户并阻止删除具备用户管理权限的目标。 */
export async function destroyUsers(db: Database, ids: string[]) {
  const targets = await db
    .select({ level: schema.user.level })
    .from(schema.user)
    .where(inArray(schema.user.id, ids));
  if (targets.some((target) => can(target.level, Permission.userManage)))
    throw new TRPCError({ code: "FORBIDDEN" });
  await observeDbOperation("user.destroy", "delete", () =>
    db.delete(schema.user).where(inArray(schema.user.id, ids)),
  );
  return { success: true as const };
}
/** 更新用户及可选凭据。 */
export async function updateUser(
  db: Database,
  input: { id: string; password?: string } & Record<string, unknown>,
) {
  const { id, password, ...rest } = input;
  const [target] = await db
    .select({ level: schema.user.level, status: schema.user.status })
    .from(schema.user)
    .where(eq(schema.user.id, id));
  if (
    target &&
    can(target.level, Permission.userManage) &&
    (("level" in rest &&
      rest.level &&
      !can(rest.level as string, Permission.userManage)) ||
      (rest.status !== undefined && rest.status !== target.status))
  )
    throw new TRPCError({ code: "FORBIDDEN" });
  const update = async (store: CredentialStore) => {
    const [user] = await observeDbOperation("user.update", "update", () =>
      store
        .update(schema.user)
        .set(rest as Partial<typeof schema.user.$inferInsert>)
        .where(eq(schema.user.id, id))
        .returning(safeUserColumns),
    );
    if (password) await setCredentialPassword(store, id, password);
    return user;
  };
  return password ? db.transaction(update) : update(db);
}
