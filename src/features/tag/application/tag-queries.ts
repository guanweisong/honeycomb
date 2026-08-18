import "server-only";

import { sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/infrastructure/db/query/tools";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import type { QueryRecord } from "@/packages/infrastructure/db/query/tools";

type TagListInput = QueryRecord & {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: string;
  name?: string;
};

/** 查询标签列表。 */
export async function getTagList(db: Database, input: TagListInput) {
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
