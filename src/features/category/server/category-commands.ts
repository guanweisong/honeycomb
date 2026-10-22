import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { SQL_ID_CHUNK_SIZE } from "@/lib/db/query/parameter-limits";
import { parseEnumValue, requireWriteResult } from "@/lib/db/value-validation";
import { bumpMenuRevisionForCategoryDeletion } from "@/features/menu/server/menu-revisions";
import { EnableStatus } from "@/lib/validation/enable-status";
import { observeDbOperation } from "@/lib/observability/server";
import { ApplicationError } from "@/lib/errors/application-error";
import { supportedLanguages } from "@/lib/i18n/i18n";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";
import type { CategoryInsert } from "../types/category.insert";
import type { CategoryUpdate } from "../types/category.update";
import { categoryPathExists, findCategory } from "./category-queries";
import {
  toCategoryTranslationRows,
  withTranslations,
} from "./category-translations";

function mapCategoryConstraint(error: unknown): never {
  if (error instanceof Error) {
    if (error.message.includes("UNIQUE constraint failed: category.path"))
      throw new ApplicationError("BAD_REQUEST", "分类路径已经存在");
    if (error.cause) return mapCategoryConstraint(error.cause);
  }
  throw error;
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
  const parentChanges = {
    ...changes,
    ...(title !== undefined || description !== undefined
      ? { updatedAt: new Date().toISOString() }
      : {}),
  };
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
      const [updated] = Object.keys(parentChanges).length
        ? await tx
            .update(schema.category)
            .set(parentChanges)
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
      if (!updated) return undefined;
      // Assemble the response before commit so a failed read rolls back the write.
      const [result] = await withTranslations(tx, [updated]);
      return requireWriteResult(result, "update", "category");
    }),
  ).catch(mapCategoryConstraint);
  if (!value && parentGuard)
    throw new ApplicationError("BAD_REQUEST", "分类不存在或父子关系形成循环");
  const persisted = requireWriteResult(value, "update", "category");
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
    db.transaction(async (tx) => {
      await bumpMenuRevisionForCategoryDeletion(tx, ids);
      for (let offset = 0; offset < ids.length; offset += SQL_ID_CHUNK_SIZE) {
        await tx
          .delete(schema.category)
          .where(
            inArray(
              schema.category.id,
              ids.slice(offset, offset + SQL_ID_CHUNK_SIZE),
            ),
          );
      }
    }),
  );
  const persisted = { success: true } as const;
  const publicSync = await invalidator.invalidate({
    refreshLayout: true,
    refreshPostIndex: true,
    refreshSitemap: true,
  });
  return { ...persisted, publicSync: publicSync.state };
}
