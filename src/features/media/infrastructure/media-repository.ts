import "server-only";
import { repositoryPaginationDefaults } from "@/packages/application/pagination";
import { requireWriteResult } from "@/packages/infrastructure/db/value-validation";

import { sql, inArray } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/infrastructure/db/query/tools";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { clientEnv } from "@/env/client";
import type { MediaRepository } from "../application/repository";
export type {
  MediaInsert,
  MediaListInput,
  MediaRepository,
} from "../application/repository";

export function createMediaRepository(db: Database): MediaRepository {
  return {
    async create(input) {
      const [media] = await observeDbOperation("media.create", "insert", () =>
        db
          .insert(schema.media)
          .values({
            ...input,
            url: `${clientEnv.NEXT_PUBLIC_ASSET_URL}/${input.key}`,
          })
          .returning(),
      );
      return requireWriteResult(media, "create", "media");
    },
    async list(input) {
      const {
        page = repositoryPaginationDefaults.page,
        limit = repositoryPaginationDefaults.limit,
        sortField,
        sortOrder,
        ...rest
      } = input;
      const where = buildDrizzleWhere(schema.media, rest, []);
      const orderBy = buildDrizzleOrderBy(
        schema.media,
        sortField,
        sortOrder,
        repositoryPaginationDefaults.sortField,
      );
      const [list, countRows] = await Promise.all([
        observeDbOperation("media.list", "select", () =>
          db
            .select()
            .from(schema.media)
            .where(where)
            .orderBy(orderBy)
            .limit(limit)
            .offset((page - 1) * limit),
        ),
        observeDbOperation("media.count", "select", () =>
          db
            .select({ count: sql<number>`count(*)`.as("count") })
            .from(schema.media)
            .where(where),
        ),
      ]);
      return { list, total: Number(countRows[0]?.count) || 0 };
    },
    async findDeleteTargets(ids) {
      return observeDbOperation("media.destroy.select", "select", () =>
        db
          .select({ id: schema.media.id, key: schema.media.key })
          .from(schema.media)
          .where(inArray(schema.media.id, ids)),
      );
    },
    async deleteRecords(ids) {
      await observeDbOperation("media.destroy.delete", "delete", () =>
        db.delete(schema.media).where(inArray(schema.media.id, ids)),
      );
      return { success: true } as const;
    },
  };
}
