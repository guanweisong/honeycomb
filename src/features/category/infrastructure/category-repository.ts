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
import { ApplicationError } from "@/packages/application/errors";

function mapCategoryConstraint(error: unknown): never {
  if (error instanceof Error) {
    if (error.message.includes("UNIQUE constraint failed: category.path"))
      throw new ApplicationError("BAD_REQUEST", "分类路径已经存在");
    if (error.cause) return mapCategoryConstraint(error.cause);
  }
  throw error;
}
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
      ).catch(mapCategoryConstraint);
      return requireWriteResult(value, "create", "category");
    },
    async update(input) {
      const { id, ...changes } = input;
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
      const [value] = await observeDbOperation(
        "category.update",
        "update",
        () =>
          db
            .update(schema.category)
            .set(changes)
            .where(and(eq(schema.category.id, id), parentGuard))
            .returning(),
      ).catch(mapCategoryConstraint);
      if (!value && parentGuard)
        throw new ApplicationError(
          "BAD_REQUEST",
          "分类不存在或父子关系形成循环",
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
        {
          ...rest,
          id,
          title,
          status: visibility === "ALL" ? status : undefined,
        },
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
        list: list.map((item) => ({ ...item, deepPath: 0 })),
        total: Number(countRows[0]?.count) || 0,
      };
    },
    async tree(visibility) {
      const rows = await observeDbOperation(
        "category.service.list",
        "select",
        () => db.select().from(schema.category).orderBy(schema.category.path),
      );
      // Assemble before visibility filtering so hidden parents also hide their subtree.
      const visible = new Map<string, boolean>();
      const list = Tools.sonsTree(rows).filter((item) => {
        const enabled =
          visibility === "ALL" ||
          (item.status === EnableStatus.ENABLE &&
            (!item.parent || visible.get(item.parent) === true));
        visible.set(item.id, enabled);
        return enabled;
      });
      return { list, total: list.length };
    },
  };
}
