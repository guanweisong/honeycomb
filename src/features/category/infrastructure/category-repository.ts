import "server-only";
import { repositoryPaginationDefaults } from "@/packages/application/pagination";
import { requireWriteResult } from "@/packages/infrastructure/db/value-validation";

import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/infrastructure/db/query/tools";
import Tools from "@/packages/infrastructure/db/query/tools";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import type { CategoryRepository } from "../application/repository";
export type {
  CategoryInsert,
  CategoryListInput,
  CategoryUpdate,
  CategoryVisibility,
  CategoryRepository,
} from "../application/repository";

export function createCategoryRepository(db: Database): CategoryRepository {
  return {
    async find(id) {
      const [value] = await observeDbOperation(
        "category.update",
        "select",
        () =>
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
      return value ?? null;
    },
    async pathExists(path, excludeId) {
      const [value] = await observeDbOperation(
        "category.update",
        "select",
        () =>
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
    },
    async create(input) {
      const [value] = await observeDbOperation(
        "category.create",
        "insert",
        () => db.insert(schema.category).values(input).returning(),
      );
      return requireWriteResult(value, "create", "category");
    },
    async update(input) {
      const { id, ...changes } = input;
      const [value] = await observeDbOperation(
        "category.update",
        "update",
        () =>
          db
            .update(schema.category)
            .set(changes)
            .where(eq(schema.category.id, id))
            .returning(),
      );
      return requireWriteResult(value, "update", "category");
    },
    async destroy(ids) {
      await observeDbOperation("category.destroy", "delete", () =>
        db.delete(schema.category).where(inArray(schema.category.id, ids)),
      );
      return { success: true } as const;
    },
    async list(input, visibility) {
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
        { ...rest, title, status: visibility === "ALL" ? status : undefined },
        ["status"],
        { title },
      );
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
        list: Tools.sonsTree(list, id),
        total: Number(countRows[0]?.count) || 0,
      };
    },
  };
}
