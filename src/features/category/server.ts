import "server-only";
import { repositoryPaginationDefaults } from "@/lib/validation/pagination";
import { parseEnumValue, requireWriteResult } from "@/lib/db/value-validation";

import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { EnableStatus } from "@/lib/validation/enable-status";
import { buildDrizzleOrderBy, buildDrizzleWhere } from "@/lib/db/query/tools";
import Tools from "@/lib/db/query/tools";
import { observeDbOperation } from "@/lib/observability/server";
import { ApplicationError } from "@/lib/errors/application-error";
import { supportedLanguages } from "@/lib/i18n/i18n";
import {
  groupCategoryTranslations,
  toCategoryTranslationRows,
} from "./server/category-translations";
import type {
  CategoryInsert,
  CategoryUpdate,
  CategoryListInput,
  CategoryVisibility,
} from "./types";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";

function mapCategoryConstraint(error: unknown): never {
  if (error instanceof Error) {
    if (error.message.includes("UNIQUE constraint failed: category.path"))
      throw new ApplicationError("BAD_REQUEST", "分类路径已经存在");
    if (error.cause) return mapCategoryConstraint(error.cause);
  }
  throw error;
}

async function withTranslations<T extends typeof schema.category.$inferSelect>(
  db: Database,
  rows: T[],
) {
  if (!rows.length) return [];
  const translations = await db
    .select()
    .from(schema.categoryTranslation)
    .where(
      inArray(
        schema.categoryTranslation.categoryId,
        rows.map(({ id }) => id),
      ),
    );
  const byId = groupCategoryTranslations(translations);
  return rows.map((row) => ({
    ...row,
    status: parseEnumValue(
      row.status,
      Object.values(EnableStatus),
      "category.status",
    ),
    title: byId.get(row.id)?.title ?? null,
    description: byId.get(row.id)?.description ?? null,
  }));
}

function assertStatus(status: string | undefined): void {
  if (
    status !== undefined &&
    status !== EnableStatus.ENABLE &&
    status !== EnableStatus.DISABLE
  ) {
    throw new ApplicationError("BAD_REQUEST", "分类状态不合法");
  }
}

async function assertParentChain(
  db: Database,
  id: string | undefined,
  parent: string | null | undefined,
): Promise<void> {
  if (parent === undefined || parent === null) return;
  if (parent === id)
    throw new ApplicationError("BAD_REQUEST", "分类不能将自己设置为父节点");

  const visited = new Set(id ? [id] : []);
  let currentId: string | null = parent;
  while (currentId) {
    if (visited.has(currentId))
      throw new ApplicationError("BAD_REQUEST", "分类父子关系不能形成循环");
    visited.add(currentId);
    const current = await findCategory(db, currentId);
    if (!current) throw new ApplicationError("BAD_REQUEST", "父级分类不存在");
    currentId = current.parent;
  }
}

async function assertPath(
  db: Database,
  path: string | undefined,
  excludeId?: string,
): Promise<void> {
  if (path !== undefined && (await categoryPathExists(db, path, excludeId))) {
    throw new ApplicationError("BAD_REQUEST", "分类路径已经存在");
  }
}
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

export async function createCategory(
  db: Database,
  input: CategoryInsert,
  invalidator: PublicContentInvalidator,
) {
  assertStatus(input.status);
  await assertParentChain(db, undefined, input.parent);
  await assertPath(db, input.path);

  const persisted = await observeDbOperation(
    "category.create",
    "transaction",
    () =>
      db.transaction(async (tx) => {
        const { title, description, ...parent } = input;
        const [created] = await tx
          .insert(schema.category)
          .values(parent)
          .returning();
        const category = requireWriteResult(created, "create", "category");
        await tx
          .insert(schema.categoryTranslation)
          .values(toCategoryTranslationRows(category.id, title, description));
        return {
          ...category,
          status: parseEnumValue(
            category.status,
            Object.values(EnableStatus),
            "category.status",
          ),
          title,
          description,
        };
      }),
  ).catch(mapCategoryConstraint);
  const publicSync = await invalidator.invalidate({
    refreshLayout: true,
    refreshPostIndex: true,
    refreshSitemap: true,
  });
  return { ...persisted, publicSync: publicSync.state };
}

export async function updateCategory(
  db: Database,
  input: CategoryUpdate,
  invalidator: PublicContentInvalidator,
) {
  const current = await findCategory(db, input.id);
  if (!current) throw new ApplicationError("NOT_FOUND", "分类不存在");
  assertStatus(input.status);
  await assertParentChain(db, input.id, input.parent);
  await assertPath(db, input.path, input.id);

  const { id, title, description, ...changes } = input;
  // The recursive guard and write share one SQLite statement, so two
  // concurrent reparentings cannot both pass a stale ancestor check.
  const parentGuard =
    input.parent == null
      ? undefined
      : sql`not exists (
        with recursive ancestors(id, parent) as (
          select id, parent from category where id = ${input.parent}
          union
          select c.id, c.parent from category c join ancestors a on c.id = a.parent
        ) select 1 from ancestors where id = ${id}
      )`;
  const value = await observeDbOperation("category.update", "transaction", () =>
    db.transaction(async (tx) => {
      const [updated] = Object.keys(changes).length
        ? await tx
            .update(schema.category)
            .set(changes)
            .where(and(eq(schema.category.id, id), parentGuard))
            .returning()
        : await tx
            .select()
            .from(schema.category)
            .where(and(eq(schema.category.id, id), parentGuard))
            .limit(1);
      if (updated && (title !== undefined || description !== undefined)) {
        for (const locale of supportedLanguages) {
          if (title !== undefined && description !== undefined) {
            await tx
              .insert(schema.categoryTranslation)
              .values({
                categoryId: id,
                locale,
                title: title[locale],
                description: description[locale],
              })
              .onConflictDoUpdate({
                target: [
                  schema.categoryTranslation.categoryId,
                  schema.categoryTranslation.locale,
                ],
                set: {
                  title: title[locale],
                  description: description[locale],
                },
              });
          } else {
            await tx
              .update(schema.categoryTranslation)
              .set({
                ...(title !== undefined ? { title: title[locale] } : {}),
                ...(description !== undefined
                  ? { description: description[locale] }
                  : {}),
              })
              .where(
                and(
                  eq(schema.categoryTranslation.categoryId, id),
                  eq(schema.categoryTranslation.locale, locale),
                ),
              );
          }
        }
      }
      return updated;
    }),
  ).catch(mapCategoryConstraint);
  if (!value && parentGuard)
    throw new ApplicationError("BAD_REQUEST", "分类不存在或父子关系形成循环");
  const category = requireWriteResult(value, "update", "category");
  const [result] = await withTranslations(db, [category]);
  const persisted = requireWriteResult(result, "update", "category");
  const publicSync = await invalidator.invalidate({
    refreshLayout: true,
    refreshPostIndex: true,
    refreshSitemap: true,
  });
  return { ...persisted, publicSync: publicSync.state };
}

export async function destroyCategories(
  db: Database,
  ids: string[],
  invalidator: PublicContentInvalidator,
) {
  await observeDbOperation("category.destroy", "delete", () =>
    db.delete(schema.category).where(inArray(schema.category.id, ids)),
  );
  const persisted = { success: true } as const;
  const publicSync = await invalidator.invalidate({
    refreshLayout: true,
    refreshPostIndex: true,
    refreshSitemap: true,
  });
  return { ...persisted, publicSync: publicSync.state };
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
  const list = Tools.sonsTree(localizedRows).filter((item) => {
    const enabled =
      visibility === "ALL" ||
      (item.status === EnableStatus.ENABLE &&
        (!item.parent || visible.get(item.parent) === true));
    visible.set(item.id, enabled);
    return enabled;
  });
  return { list, total: list.length };
}
