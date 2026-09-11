import "server-only";
import { repositoryPaginationDefaults } from "@/packages/application/pagination";
import { requireWriteResult } from "@/packages/infrastructure/db/value-validation";

import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/infrastructure/db/query/tools";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import type { TagRepository } from "../application/repository";
import { supportedLanguages } from "@/packages/domain/localization/i18n";
import { groupTagTranslations, toTagTranslationRows } from "./tag-translations";
export type {
  TagInsert,
  TagListInput,
  TagRepository,
  TagUpdate,
} from "../application/repository";

export function createTagRepository(db: Database): TagRepository {
  async function withTranslations<T extends typeof schema.tag.$inferSelect>(rows: T[]) {
    if (!rows.length) return [];
    const translations = await db
      .select()
      .from(schema.tagTranslation)
      .where(inArray(schema.tagTranslation.tagId, rows.map(({ id }) => id)));
    const byId = groupTagTranslations(translations);
    return rows.map((row) => ({ ...row, name: byId.get(row.id) ?? null }));
  }

  return {
    async create(input) {
      return observeDbOperation("tag.create", "transaction", () =>
        db.transaction(async (tx) => {
          const { name, ...parent } = input;
          const [created] = await tx.insert(schema.tag).values(parent).returning();
          const tag = requireWriteResult(created, "create", "tag");
          await tx.insert(schema.tagTranslation).values(toTagTranslationRows(tag.id, name));
          return { ...tag, name };
        }),
      );
    },
    async update(input) {
      const { id, name, ...changes } = input;
      const value = await observeDbOperation("tag.update", "transaction", () =>
        db.transaction(async (tx) => {
          const [updated] = Object.keys(changes).length
            ? await tx.update(schema.tag).set(changes).where(eq(schema.tag.id, id)).returning()
            : await tx.select().from(schema.tag).where(eq(schema.tag.id, id)).limit(1);
          if (updated && name !== undefined) {
            for (const locale of supportedLanguages) {
              await tx
                .update(schema.tagTranslation)
                .set({ name: name[locale] })
                .where(
                  and(
                    eq(schema.tagTranslation.tagId, id),
                    eq(schema.tagTranslation.locale, locale),
                  ),
                );
            }
          }
          return updated;
        }),
      );
      const tag = requireWriteResult(value, "update", "tag");
      const [result] = await withTranslations([tag]);
      return requireWriteResult(result, "update", "tag");
    },
    async destroy(ids) {
      await observeDbOperation("tag.destroy", "delete", () =>
        db.delete(schema.tag).where(inArray(schema.tag.id, ids)),
      );
      return { success: true } as const;
    },
    async list(input) {
      const {
        page = repositoryPaginationDefaults.page,
        limit = repositoryPaginationDefaults.limit,
        sortField,
        sortOrder,
        name,
        ...rest
      } = input;
      let where = buildDrizzleWhere(
        schema.tag,
        rest,
        ["status"],
      );
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
      return { list: await withTranslations(list), total: Number(countRows[0]?.count) || 0 };
    },
  };
}
