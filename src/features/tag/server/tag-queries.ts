import "server-only";
import { repositoryPaginationDefaults } from "@/lib/validation/pagination";
import { and, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/lib/db/query/query-builders";
import { observeDbOperation } from "@/lib/observability/server";
import type { TagListInput } from "@/features/tag/types/tag.list";
import { withTranslations } from "@/features/tag/server/tag-translations";

export async function listTags(db: Database, input: TagListInput) {
  const {
    page = repositoryPaginationDefaults.page,
    limit = repositoryPaginationDefaults.limit,
    sortField,
    sortOrder,
    name,
    ...rest
  } = input;
  let where = buildDrizzleWhere(schema.tag, rest, ["id"]);
  if (name) {
    const nameMatch = sql`exists (
          select 1 from ${schema.tagTranslation}
          where ${schema.tagTranslation.tagId} = ${schema.tag.id}
            and ${schema.tagTranslation.name} like ${`%${name}%`}
        )`;
    where = where ? and(where, nameMatch) : nameMatch;
  }
  const orderBy = buildDrizzleOrderBy(
    schema.tag,
    sortField,
    sortOrder,
    repositoryPaginationDefaults.sortField,
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
  return {
    list: await withTranslations(db, list),
    total: Number(countRows[0]?.count) || 0,
  };
}
