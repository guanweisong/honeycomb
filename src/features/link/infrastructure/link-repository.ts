import "server-only";
import { repositoryPaginationDefaults } from "@/packages/application/pagination";
import {
  parseEnumValue,
  requireWriteResult,
} from "@/packages/infrastructure/db/value-validation";

import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/infrastructure/db/query/tools";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import type { LinkRepository } from "../application/repository";
import type { LinkRecord } from "../application/repository";
export type {
  LinkInsert,
  LinkListInput,
  LinkRepository,
  LinkUpdate,
  LinkVisibility,
} from "../application/repository";

function toLinkRecord(
  row: typeof schema.link.$inferSelect,
): LinkRecord {
  return {
    ...row,
    status:
      row.status === null
        ? null
        : parseEnumValue(
            row.status,
            Object.values(EnableStatus),
            "link.status",
          ),
  };
}

export function createLinkRepository(db: Database): LinkRepository {
  return {
    async create(input) {
      const [value] = await observeDbOperation("link.create", "insert", () =>
        db.insert(schema.link).values(input).returning(),
      );
      return toLinkRecord(requireWriteResult(value, "create", "link"));
    },
    async update(input) {
      const { id, ...changes } = input;
      const [value] = await observeDbOperation("link.update", "update", () =>
        db
          .update(schema.link)
          .set(changes)
          .where(eq(schema.link.id, id))
          .returning(),
      );
      return toLinkRecord(requireWriteResult(value, "update", "link"));
    },
    async destroy(ids) {
      await observeDbOperation("link.destroy", "delete", () =>
        db.delete(schema.link).where(inArray(schema.link.id, ids)),
      );
      return { success: true } as const;
    },
    async list(input, visibility) {
      const {
        page = repositoryPaginationDefaults.page,
        limit = repositoryPaginationDefaults.limit,
        sortField,
        sortOrder,
        status,
        ...rest
      } = input;
      let where = buildDrizzleWhere(
        schema.link,
        {
          ...rest,
          status: visibility === "ALL" ? status : undefined,
        },
        ["status"],
      );
      if (visibility === "PUBLIC_ONLY") {
        const enabled = eq(schema.link.status, EnableStatus.ENABLE);
        where = where ? and(where, enabled) : enabled;
      }
      const orderBy = buildDrizzleOrderBy(
        schema.link,
        sortField,
        sortOrder,
        repositoryPaginationDefaults.sortField,
      );
      const [list, countRows] = await Promise.all([
        observeDbOperation("link.service.list", "select", () =>
          db
            .select()
            .from(schema.link)
            .where(where)
            .orderBy(orderBy)
            .limit(limit)
            .offset((page - 1) * limit),
        ),
        observeDbOperation("link.service.count", "select", () =>
          db
            .select({ count: sql<number>`count(*)`.as("count") })
            .from(schema.link)
            .where(where),
        ),
      ]);
      return {
        list: list.map(toLinkRecord),
        total: Number(countRows[0]?.count) || 0,
      };
    },
  };
}
