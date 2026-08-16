import "server-only";

import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/infrastructure/db/query/tools";
import Tools from "@/packages/infrastructure/db/query/tools";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import type { QueryValue } from "@/packages/infrastructure/db/query/tools";

type CategoryListInput = {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: string;
  id?: string;
  title?: string;
  status?: QueryValue;
};
type Visibility = "PUBLIC_ONLY" | "ALL";

/** 查询分类列表并构建分类树。 */
export async function getCategoryList(
  db: Database,
  input: CategoryListInput,
  visibility: Visibility = "PUBLIC_ONLY",
) {
  const {
    id,
    page = 1,
    limit = 10,
    sortField,
    sortOrder,
    title,
    status,
    ...rest
  } = input;
  let where = buildDrizzleWhere(
    schema.category,
    { ...rest, title, status: visibility === "ALL" ? status : undefined },
    ["status"],
    { title },
  );
  if (visibility === "PUBLIC_ONLY") {
    const enabled = eq(schema.category.status, EnableStatus.ENABLE);
    where = where ? and(where, enabled) : enabled;
  }
  const orderBy = buildDrizzleOrderBy(
    schema.category,
    sortField,
    sortOrder as "asc" | "desc",
    "createdAt",
  );
  const [list, countRows] = await Promise.all([
    observeDbOperation("category.service.list", "select", () =>
      db
        .select()
        .from(schema.category)
        .where(where)
        .orderBy(orderBy)
        .limit(limit)
        .offset((page - 1) * limit),
    ),
    observeDbOperation("category.service.count", "select", () =>
      db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.category)
        .where(where),
    ),
  ]);
  return {
    list: Tools.sonsTree(list, id),
    total: Number(countRows[0]?.count) || 0,
  };
}
