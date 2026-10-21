import "server-only";
import { repositoryPaginationDefaults } from "@/lib/validation/pagination";
import { requireWriteResult } from "@/lib/db/value-validation";

import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/lib/db/query/query-builders";
import { observeDbOperation } from "@/lib/observability/server";
import { supportedLanguages } from "@/lib/i18n/i18n";
import {
  groupTagTranslations,
  toTagTranslationRows,
} from "./server/tag-translations";
import type { TagInsert, TagUpdate, TagListInput } from "./types";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";

async function withTranslations<T extends typeof schema.tag.$inferSelect>(
  db: Pick<Database, "select">,
  rows: T[],
) {
  if (!rows.length) return [];
  const translations = await db
    .select()
    .from(schema.tagTranslation)
    .where(
      inArray(
        schema.tagTranslation.tagId,
        rows.map(({ id }) => id),
      ),
    );
  const byId = groupTagTranslations(translations);
  return rows.map((row) => ({ ...row, name: byId.get(row.id) ?? null }));
}
export async function createTag(
  db: Database,
  input: TagInsert,
  invalidator: PublicContentInvalidator,
) {
  const persisted = await observeDbOperation("tag.create", "transaction", () =>
    db.transaction(async (tx) => {
      const { name, ...parent } = input;
      const [created] = await tx.insert(schema.tag).values(parent).returning();
      const tag = requireWriteResult(created, "create", "tag");
      await tx
        .insert(schema.tagTranslation)
        .values(toTagTranslationRows(tag.id, name));
      return { ...tag, name };
    }),
  );
  const publicSync = await invalidator.invalidate({
    refreshLayout: true,
    refreshPostIndex: true,
  });
  return { ...persisted, publicSync: publicSync.state };
}

export async function updateTag(
  db: Database,
  input: TagUpdate,
  invalidator: PublicContentInvalidator,
) {
  const { id, name, ...changes } = input;
  const parentChanges = {
    ...changes,
    ...(name !== undefined ? { updatedAt: new Date().toISOString() } : {}),
  };
  const value = await observeDbOperation("tag.update", "transaction", () =>
    db.transaction(async (tx) => {
      const [updated] = Object.keys(parentChanges).length
        ? await tx
            .update(schema.tag)
            .set(parentChanges)
            .where(eq(schema.tag.id, id))
            .returning()
        : await tx
            .select()
            .from(schema.tag)
            .where(eq(schema.tag.id, id))
            .limit(1);
      if (updated && name !== undefined) {
        for (const locale of supportedLanguages) {
          await tx
            .insert(schema.tagTranslation)
            .values({ tagId: id, locale, name: name[locale] })
            .onConflictDoUpdate({
              target: [
                schema.tagTranslation.tagId,
                schema.tagTranslation.locale,
              ],
              set: { name: name[locale] },
            });
        }
      }
      if (!updated) return undefined;
      // Assemble the response before commit so a failed read rolls back the write.
      const [result] = await withTranslations(tx, [updated]);
      return requireWriteResult(result, "update", "tag");
    }),
  );
  const persisted = requireWriteResult(value, "update", "tag");
  const publicSync = await invalidator.invalidate({
    refreshLayout: true,
    refreshPostIndex: true,
  });
  return { ...persisted, publicSync: publicSync.state };
}

export async function destroyTags(
  db: Database,
  ids: string[],
  invalidator: PublicContentInvalidator,
) {
  await observeDbOperation("tag.destroy", "delete", () =>
    db.transaction(async (tx) => {
      await tx
        .update(schema.post)
        .set({
          version: sql`${schema.post.version} + 1`,
          updatedAt: sql`${schema.post.updatedAt}`,
        })
        .where(
          inArray(
            schema.post.id,
            tx
              .select({ postId: schema.postTag.postId })
              .from(schema.postTag)
              .where(inArray(schema.postTag.tagId, ids)),
          ),
        );
      await tx.delete(schema.tag).where(inArray(schema.tag.id, ids));
    }),
  );
  const persisted = { success: true } as const;
  const publicSync = await invalidator.invalidate({
    refreshLayout: true,
    refreshPostIndex: true,
  });
  return { ...persisted, publicSync: publicSync.state };
}

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
