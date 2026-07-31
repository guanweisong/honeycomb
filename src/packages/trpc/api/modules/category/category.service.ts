import "server-only";

import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/packages/db/db";
import * as schema from "@/packages/db/schema";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/trpc/api/utils/tools";
import Tools from "@/packages/trpc/api/utils/tools";
import type { CategoryListQueryInput } from "./schemas/category.list.query.schema";
import { EnableStatus } from "@/packages/trpc/api/types/enable.status";
import { ResourceVisibility } from "@/packages/trpc/api/types/resource-visibility";
import { observeDbOperation } from "@/packages/observability/server";

export async function getCategoryList(
  db: Database,
  input: CategoryListQueryInput,
  visibility = ResourceVisibility.PUBLIC_ONLY,
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
    {
      ...rest,
      title,
      status: visibility === ResourceVisibility.ALL ? status : undefined,
    },
    ["status"],
    { title },
  );
  if (visibility === ResourceVisibility.PUBLIC_ONLY) {
    const enabled = eq(schema.category.status, EnableStatus.ENABLE);
    where = where ? and(where, enabled) : enabled;
  }

  const orderBy = buildDrizzleOrderBy(
    schema.category,
    sortField,
    sortOrder as "asc" | "desc",
    "createdAt",
  );
  const list = await observeDbOperation("category.service.list", "select", () =>
    db
      .select()
      .from(schema.category)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset((page - 1) * limit),
  );
  const [countResult] = await observeDbOperation(
    "category.service.count",
    "select",
    () =>
      db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.category)
        .where(where),
  );

  return {
    list: Tools.sonsTree(list, id),
    total: Number(countResult?.count) || 0,
  };
}
