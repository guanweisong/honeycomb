import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { repositoryPaginationDefaults } from "@/lib/validation/pagination";
import { parseEnumValue } from "@/lib/db/value-validation";
import { EnableStatus } from "@/lib/validation/enable-status";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/lib/db/query/query-builders";
import { observeDbOperation } from "@/lib/observability/server";
import type {
  CategoryListInput,
  CategoryVisibility,
} from "@/features/category/types/category.list";
import { flattenCategoryHierarchy } from "@/features/category/tree";
import { withTranslations } from "@/features/category/server/category-translations";

export async function findCategory(db: Database, id: string) {
  const [value] = await observeDbOperation("category.update", "select", () =>
    db
      .select({
        id: schema.category.id,
        parent: schema.category.parent,
        path: schema.category.path,
        status: schema.category.status,
      })
      .from(schema.category)
      .where(eq(schema.category.id, id))
      .limit(1),
  );
  return value
    ? {
        ...value,
        status: parseEnumValue(
          value.status,
          Object.values(EnableStatus),
          "category.status",
        ),
      }
    : null;
}

export async function categoryPathExists(
  db: Database,
  path: string,
  excludeId?: string,
) {
  const [value] = await observeDbOperation("category.update", "select", () =>
    db
      .select({ id: schema.category.id })
      .from(schema.category)
      .where(
        excludeId
          ? and(
              eq(schema.category.path, path),
              ne(schema.category.id, excludeId),
            )
          : eq(schema.category.path, path),
      )
      .limit(1),
  );
  return Boolean(value);
}

export async function listCategories(
  db: Database,
  input: CategoryListInput,
  visibility: CategoryVisibility,
) {
  const {
    id,
    page = repositoryPaginationDefaults.page,
    limit = repositoryPaginationDefaults.limit,
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
      id,
      status: visibility === "ALL" ? status : undefined,
    },
    ["status"],
  );
  if (title) {
    const titleMatch = sql`exists (
          select 1 from ${schema.categoryTranslation}
          where ${schema.categoryTranslation.categoryId} = ${schema.category.id}
            and ${schema.categoryTranslation.title} like ${`%${title}%`}
        )`;
    where = where ? and(where, titleMatch) : titleMatch;
  }
  if (visibility === "PUBLIC_ONLY") {
    const enabled = eq(schema.category.status, EnableStatus.ENABLE);
    where = where ? and(where, enabled) : enabled;
  }
  const orderBy = buildDrizzleOrderBy(
    schema.category,
    sortField,
    sortOrder,
    repositoryPaginationDefaults.sortField,
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
    list: (await withTranslations(db, list)).map((item) => ({
      ...item,
      deepPath: 0,
    })),
    total: Number(countRows[0]?.count) || 0,
  };
}

export async function getCategoryTree(
  db: Database,
  visibility: CategoryVisibility,
) {
  const rows = await observeDbOperation("category.service.list", "select", () =>
    db.select().from(schema.category).orderBy(schema.category.path),
  );
  // Assemble before visibility filtering so hidden parents also hide their subtree.
  const visible = new Map<string, boolean>();
  const localizedRows = await withTranslations(db, rows);
  const list = flattenCategoryHierarchy(localizedRows).filter((item) => {
    const enabled =
      visibility === "ALL" ||
      (item.status === EnableStatus.ENABLE &&
        (!item.parent || visible.get(item.parent) === true));
    visible.set(item.id, enabled);
    return enabled;
  });
  return { list, total: list.length };
}
