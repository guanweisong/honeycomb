import "server-only";

import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/trpc/api/utils/tools";
import type { LinkListQueryInput } from "./schemas/link.list.query.schema";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { ResourceVisibility } from "@/packages/trpc/api/types/resource-visibility";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

export async function getLinkList(
  db: Database,
  input: LinkListQueryInput,
  visibility = ResourceVisibility.PUBLIC_ONLY,
) {
  const { page = 1, limit = 10, sortField, sortOrder, status, ...rest } = input;
  const searchText = rest.name || rest.description;
  let where = buildDrizzleWhere(
    schema.link,
    {
      ...rest,
      name: searchText,
      status: visibility === ResourceVisibility.ALL ? status : undefined,
    },
    ["status"],
    { name: searchText },
  );
  if (visibility === ResourceVisibility.PUBLIC_ONLY) {
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
  const [countResult] = countRows;

  return { list, total: Number(countResult?.count) || 0 };
}
