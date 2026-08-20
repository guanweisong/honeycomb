import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { buildDrizzleOrderBy, buildDrizzleWhere, type QueryValue } from "@/packages/infrastructure/db/query/tools";
import Tools from "@/packages/infrastructure/db/query/tools";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import type { CategoryRepository } from "../repository";
export type { CategoryInsert, CategoryListInput, CategoryUpdate, CategoryVisibility, CategoryRepository } from "../repository";

export function createCategoryRepository(db: Database): CategoryRepository {
  return {
    async create(input) {
      const [value] = await observeDbOperation("category.create", "insert", () => db.insert(schema.category).values(input as typeof schema.category.$inferInsert).returning());
      return value;
    },
    async update(input) {
      const { id, ...changes } = input;
      const [value] = await observeDbOperation("category.update", "update", () => db.update(schema.category).set(changes as Partial<typeof schema.category.$inferInsert>).where(eq(schema.category.id, id)).returning());
      return value;
    },
    async destroy(ids) {
      await observeDbOperation("category.destroy", "delete", () => db.delete(schema.category).where(inArray(schema.category.id, ids)));
      return { success: true } as const;
    },
    async list(input, visibility) {
      const { id, page = 1, limit = 10, sortField, sortOrder, title, status, ...rest } = input;
      let where = buildDrizzleWhere(schema.category, { ...rest, title, status: visibility === "ALL" ? status as QueryValue : undefined }, ["status"], { title });
      if (visibility === "PUBLIC_ONLY") {
        const enabled = eq(schema.category.status, EnableStatus.ENABLE);
        where = where ? and(where, enabled) : enabled;
      }
      const orderBy = buildDrizzleOrderBy(schema.category, sortField, sortOrder as "asc" | "desc", "createdAt");
      const [list, countRows] = await Promise.all([
        observeDbOperation("category.service.list", "select", () => db.select().from(schema.category).where(where).orderBy(orderBy).limit(limit).offset((page - 1) * limit)),
        observeDbOperation("category.service.count", "select", () => db.select({ count: sql<number>`count(*)`.as("count") }).from(schema.category).where(where)),
      ]);
      return { list: Tools.sonsTree(list, id), total: Number(countRows[0]?.count) || 0 };
    },
  };
}
