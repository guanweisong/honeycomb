import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/packages/db/db";
import * as schema from "@/packages/db/schema";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/trpc/api/utils/tools";
import type { LinkListQueryInput } from "./schemas/link.list.query.schema";
import { EnableStatus } from "@/packages/trpc/api/types/enable.status";
import { ResourceVisibility } from "@/packages/trpc/api/types/resource-visibility";

export async function getLinkList(
  db: Database,
  input: LinkListQueryInput,
  visibility = ResourceVisibility.PUBLIC_ONLY,
) {
  const {
    page = 1,
    limit = 10,
    sortField,
    sortOrder,
    status,
    ...rest
  } = input;
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
  const list = await db
    .select()
    .from(schema.link)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset((page - 1) * limit);
  const [countResult] = await db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(schema.link)
    .where(where);

  return { list, total: Number(countResult?.count) || 0 };
}
