import "server-only";
import { eq, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/infrastructure/db/query/tools";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import type { QueryRecord } from "@/packages/infrastructure/db/query/tools";

export class UserQueryError extends Error {
  constructor(public readonly code: "UNAUTHORIZED") {
    super(code);
  }
}
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
  if (!user) throw new UserQueryError("UNAUTHORIZED");
  return user;
}
/** 查询用户列表。 */
export async function getUserList(
  db: Database,
  input: {
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: string;
  } & QueryRecord,
) {
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
