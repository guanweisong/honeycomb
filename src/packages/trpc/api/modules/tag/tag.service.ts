import "server-only";

import { eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/trpc/api/utils/tools";
import type { TagListQueryInput } from "./schemas/tag.list.query.schema";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

/** 查询标签列表。 */
export async function getTagList(db: Database, input: TagListQueryInput) {
  const { page = 1, limit = 10, sortField, sortOrder, name, ...rest } = input;
  const where = buildDrizzleWhere(schema.tag, { ...rest, name }, ["status"], {
    name,
  });
  const orderBy = buildDrizzleOrderBy(
    schema.tag,
    sortField,
    sortOrder as "asc" | "desc",
    "createdAt",
  );
  const [list, countRows] = await Promise.all([
    observeDbOperation("tag.list", "select", () =>
      db
        .select()
        .from(schema.tag)
        .where(where)
        .orderBy(orderBy)
        .limit(limit)
        .offset((page - 1) * limit),
    ),
    observeDbOperation("tag.count", "select", () =>
      db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.tag)
        .where(where),
    ),
  ]);
  return { list, total: Number(countRows[0]?.count) || 0 };
}

/** 创建标签。 */
export async function createTag(db: Database, input: unknown) {
  const [tag] = await observeDbOperation("tag.create", "insert", () =>
    db
      .insert(schema.tag)
      .values(input as typeof schema.tag.$inferInsert)
      .returning(),
  );
  return tag;
}

/** 批量删除标签。 */
export async function destroyTags(db: Database, ids: string[]) {
  await observeDbOperation("tag.destroy", "delete", () =>
    db.delete(schema.tag).where(inArray(schema.tag.id, ids)),
  );
  return { success: true as const };
}

/** 更新标签。 */
export async function updateTag(
  db: Database,
  input: { id: string } & Record<string, unknown>,
) {
  const { id, ...rest } = input;
  const [tag] = await observeDbOperation("tag.update", "update", () =>
    db
      .update(schema.tag)
      .set(rest as Partial<typeof schema.tag.$inferInsert>)
      .where(eq(schema.tag.id, id))
      .returning(),
  );
  return tag;
}
