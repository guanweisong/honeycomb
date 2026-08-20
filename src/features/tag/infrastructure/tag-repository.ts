import "server-only";

import { eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { buildDrizzleOrderBy, buildDrizzleWhere } from "@/packages/infrastructure/db/query/tools";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import type { TagRecord, TagRepository } from "../repository";
export type { TagInsert, TagListInput, TagRepository, TagUpdate } from "../repository";

export function createTagRepository(db: Database): TagRepository {
  return {
    async create(input) {
      const [value] = await observeDbOperation("tag.create", "insert", () =>
        db.insert(schema.tag).values(input as typeof schema.tag.$inferInsert).returning(),
      );
      return value as TagRecord;
    },
    async update(input) {
      const { id, ...changes } = input;
      const [value] = await observeDbOperation("tag.update", "update", () =>
        db.update(schema.tag).set(changes as Partial<typeof schema.tag.$inferInsert>).where(eq(schema.tag.id, id)).returning(),
      );
      return value as TagRecord;
    },
    async destroy(ids) {
      await observeDbOperation("tag.destroy", "delete", () =>
        db.delete(schema.tag).where(inArray(schema.tag.id, ids)),
      );
      return { success: true } as const;
    },
    async list(input) {
      const { page = 1, limit = 10, sortField, sortOrder, name, ...rest } = input;
      const where = buildDrizzleWhere(schema.tag, { ...rest, name }, ["status"], { name });
      const orderBy = buildDrizzleOrderBy(
        schema.tag,
        sortField,
        sortOrder as "asc" | "desc",
        "createdAt",
      );
      const [list, countRows] = await Promise.all([
        observeDbOperation("tag.list", "select", () =>
          db.select().from(schema.tag).where(where).orderBy(orderBy)
            .limit(limit).offset((page - 1) * limit),
        ),
        observeDbOperation("tag.count", "select", () =>
          db.select({ count: sql<number>`count(*)`.as("count") }).from(schema.tag).where(where),
        ),
      ]);
      return { list: list as TagRecord[], total: Number(countRows[0]?.count) || 0 };
    },
  };
}
