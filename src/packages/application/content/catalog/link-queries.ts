import "server-only";

import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/infrastructure/db/query/tools";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import type {
  QueryRecord,
  QueryValue,
} from "@/packages/infrastructure/db/query/tools";

type LinkListInput = QueryRecord & {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: string;
  name?: string;
  description?: string;
  status?: QueryValue;
};
type Visibility = "PUBLIC_ONLY" | "ALL";

/** 查询友情链接列表。 */
export async function getLinkList(
  db: Database,
  input: LinkListInput,
  visibility: Visibility = "PUBLIC_ONLY",
) {
  const { page = 1, limit = 10, sortField, sortOrder, status, ...rest } = input;
  const searchText = rest.name || rest.description;
  let where = buildDrizzleWhere(
    schema.link,
    {
      ...rest,
      name: searchText,
      status: visibility === "ALL" ? status : undefined,
    },
    ["status"],
    { name: searchText },
  );
  if (visibility === "PUBLIC_ONLY") {
    const enabled = eq(schema.link.status, EnableStatus.ENABLE);
    where = where ? and(where, enabled) : enabled;
  }
  const orderBy = buildDrizzleOrderBy(
    schema.link,
    sortField,
    sortOrder as "asc" | "desc",
    "createdAt",
  );
  const [list, countRows] = await Promise.all([
    observeDbOperation("link.service.list", "select", () =>
      db
        .select()
        .from(schema.link)
        .where(where)
        .orderBy(orderBy)
        .limit(limit)
        .offset((page - 1) * limit),
    ),
    observeDbOperation("link.service.count", "select", () =>
      db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.link)
        .where(where),
    ),
  ]);
  return { list, total: Number(countRows[0]?.count) || 0 };
}
