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

export function createPageCommandRepository(
  db: Database,
): PageCommandRepository {
  return {
    async create(input, authorId) {
      const [page] = await observeDbOperation("page.create", "insert", () =>
        db
          .insert(schema.page)
          .values(toPageInsertValues(input, authorId))
          .returning(),
      );
      const result = requireWriteResult(page, "create", "page");
      return result;
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
      const { id, ...rest } = input;
      const [page] = await observeDbOperation("page.update", "update", () =>
        db
          .update(schema.page)
          .set(toPageUpdateValues(rest))
          .where(eq(schema.page.id, id))
          .returning(),
      );
      const result = requireWriteResult(page, "update", "page");
      return result;
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
