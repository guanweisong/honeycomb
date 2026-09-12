import "server-only";
import {
  parseEnumValue,
  requireWriteResult,
} from "@/packages/infrastructure/db/value-validation";
import { and, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import { PageStatus } from "@/packages/domain/content/page";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import type { PageCommandRepository } from "../application/repository";
import { toPageInsertValues, toPageUpdateValues } from "./page-transforms";
import { supportedLanguages } from "@/packages/domain/localization/i18n";
import { sanitizeOptionalI18nHtml } from "@/packages/infrastructure/security/sanitize-html";
import { toPageTranslationRows } from "./page-translations";

export function createPageCommandRepository(
  db: Database,
): PageCommandRepository {
  return {
    async create(input, authorId) {
      const page = await observeDbOperation("page.create", "transaction", () =>
        db.transaction(async (tx) => {
          const [created] = await tx
            .insert(schema.page)
            .values(toPageInsertValues(input, authorId))
            .returning();
          const result = requireWriteResult(created, "create", "page");
          await tx.insert(schema.pageTranslation).values(
            toPageTranslationRows(
              result.id,
              input.title,
              sanitizeOptionalI18nHtml(input.content),
            ),
          );
          return result;
        }),
      );
      return page;
    },
    async destroy(ids) {
      await observeDbOperation("page.destroy", "delete", () =>
        db.delete(schema.page).where(inArray(schema.page.id, ids)),
      );
      return { success: true } as const;
    },
    async findStatus(id) {
      const [page] = await observeDbOperation("page.update", "select", () =>
        db
          .select({ status: schema.page.status })
          .from(schema.page)
          .where(eq(schema.page.id, id))
          .limit(1),
      );
      return page
        ? parseEnumValue(page.status, Object.values(PageStatus), "page.status")
        : null;
    },
    async update(input) {
      const { id, title, content, ...rest } = input;
      const page = await observeDbOperation("page.update", "transaction", () =>
        db.transaction(async (tx) => {
          const parentValues = toPageUpdateValues(rest);
          const [updated] = Object.keys(parentValues).length
            ? await tx
                .update(schema.page)
                .set(parentValues)
                .where(eq(schema.page.id, id))
                .returning()
            : await tx.select().from(schema.page).where(eq(schema.page.id, id)).limit(1);
          if (updated && (title !== undefined || content !== undefined)) {
            const sanitizedContent =
              content === undefined ? undefined : sanitizeOptionalI18nHtml(content);
            for (const locale of supportedLanguages) {
              if (title !== undefined && sanitizedContent !== undefined) {
                await tx
                  .insert(schema.pageTranslation)
                  .values({
                    pageId: id,
                    locale,
                    title: title[locale],
                    content: sanitizedContent[locale],
                  })
                  .onConflictDoUpdate({
                    target: [
                      schema.pageTranslation.pageId,
                      schema.pageTranslation.locale,
                    ],
                    set: {
                      title: title[locale],
                      content: sanitizedContent[locale],
                    },
                  });
              } else {
                await tx
                  .update(schema.pageTranslation)
                  .set({
                    ...(title !== undefined ? { title: title[locale] } : {}),
                    ...(sanitizedContent !== undefined
                      ? { content: sanitizedContent[locale] }
                      : {}),
                  })
                  .where(
                    and(
                      eq(schema.pageTranslation.pageId, id),
                      eq(schema.pageTranslation.locale, locale),
                    ),
                  );
              }
            }
          }
          return updated;
        }),
      );
      return requireWriteResult(page, "update", "page");
    },
    async incrementViews(id) {
      const [page] = await observeDbOperation(
        "page.increment-views",
        "update",
        () =>
          db
            .update(schema.page)
            .set({ views: sql`${schema.page.views} + 1` })
            .where(
              and(
                eq(schema.page.id, id),
                eq(schema.page.status, PageStatus.PUBLISHED),
              ),
            )
            .returning({ views: schema.page.views }),
      );
      return page;
    },
  };
}
