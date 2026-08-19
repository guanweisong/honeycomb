import "server-only";

import { and, eq, inArray, sql, type InferInsertModel } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { buildDrizzleOrderBy, buildDrizzleWhere, type QueryRecord, type QueryValue } from "@/packages/infrastructure/db/query/tools";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

export type LinkInsert = typeof schema.link.$inferInsert;
export type LinkUpdate = { id: string } & Partial<InferInsertModel<typeof schema.link>>;
export type LinkListInput = QueryRecord & {
  page?: number; limit?: number; sortField?: string; sortOrder?: string;
  name?: string; description?: string; status?: QueryValue;
};
export type LinkVisibility = "PUBLIC_ONLY" | "ALL";

export interface LinkRepository {
  create(input: LinkInsert): Promise<typeof schema.link.$inferSelect>;
  update(input: LinkUpdate): Promise<typeof schema.link.$inferSelect>;
  destroy(ids: string[]): Promise<{ success: true }>;
  list(input: LinkListInput, visibility: LinkVisibility): Promise<{ list: (typeof schema.link.$inferSelect)[]; total: number }>;
}

export function createLinkRepository(db: Database): LinkRepository {
  return {
    async create(input) {
      const [value] = await observeDbOperation("link.create", "insert", () => db.insert(schema.link).values(input).returning());
      return value;
    },
    async update(input) {
      const { id, ...changes } = input;
      const [value] = await observeDbOperation("link.update", "update", () => db.update(schema.link).set(changes).where(eq(schema.link.id, id)).returning());
      return value;
    },
    async destroy(ids) {
      await observeDbOperation("link.destroy", "delete", () => db.delete(schema.link).where(inArray(schema.link.id, ids)));
      return { success: true } as const;
    },
    async list(input, visibility) {
      const { page = 1, limit = 10, sortField, sortOrder, status, ...rest } = input;
      const searchText = rest.name || rest.description;
      let where = buildDrizzleWhere(schema.link, { ...rest, name: searchText, status: visibility === "ALL" ? status : undefined }, ["status"], { name: searchText });
      if (visibility === "PUBLIC_ONLY") {
        const enabled = eq(schema.link.status, EnableStatus.ENABLE);
        where = where ? and(where, enabled) : enabled;
      }
      const orderBy = buildDrizzleOrderBy(schema.link, sortField, sortOrder as "asc" | "desc", "createdAt");
      const [list, countRows] = await Promise.all([
        observeDbOperation("link.service.list", "select", () => db.select().from(schema.link).where(where).orderBy(orderBy).limit(limit).offset((page - 1) * limit)),
        observeDbOperation("link.service.count", "select", () => db.select({ count: sql<number>`count(*)`.as("count") }).from(schema.link).where(where)),
      ]);
      return { list, total: Number(countRows[0]?.count) || 0 };
    },
  };
}
