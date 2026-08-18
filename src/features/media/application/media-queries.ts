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

/** 查询媒体列表。 */
export async function getMediaList(
  db: Database,
  input: {
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: string;
  } & QueryRecord,
) {
  const { page = 1, limit = 10, sortField, sortOrder, ...rest } = input;
  const where = buildDrizzleWhere(schema.media, rest, []);
  const orderBy = buildDrizzleOrderBy(
    schema.media,
    sortField,
    sortOrder as "asc" | "desc",
    "createdAt",
  );
  const [list, countRows] = await Promise.all([
    observeDbOperation("media.list", "select", () =>
      db
        .select()
        .from(schema.media)
        .where(where)
        .orderBy(orderBy)
        .limit(limit)
        .offset((page - 1) * limit),
    ),
    observeDbOperation("media.count", "select", () =>
      db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.media)
        .where(where),
    ),
  ]);
  return { list, total: Number(countRows[0]?.count) || 0 };
}
