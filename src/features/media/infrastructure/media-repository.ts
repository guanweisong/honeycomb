import "server-only";

import { sql, inArray } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/infrastructure/db/query/tools";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import S3 from "@/packages/infrastructure/storage/S3";
import { clientEnv } from "@/env/client";
import type { MediaRecord, MediaRepository } from "../repository";
export type { MediaInsert, MediaListInput, MediaRepository } from "../repository";

export function createMediaRepository(db: Database): MediaRepository {
  return {
    async create(input) {
      const [media] = await observeDbOperation("media.create", "insert", () =>
        db
          .insert(schema.media)
          .values({
            ...input,
            url: `${clientEnv.NEXT_PUBLIC_ASSET_URL}/${input.key}`,
          } as typeof schema.media.$inferInsert)
          .returning(),
      );
      return media;
    },
    async list(input) {
      const { page = 1, limit = 10, sortField, sortOrder, ...rest } = input;
      const where = buildDrizzleWhere(schema.media, rest, []);
      const orderBy = buildDrizzleOrderBy(
        schema.media,
        sortField,
        sortOrder as "asc" | "desc",
        "createdAt",
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
      return { list: list as MediaRecord[], total: Number(countRows[0]?.count) || 0 };
    },
    async destroy(ids) {
      const media = await observeDbOperation("media.destroy.select", "select", () =>
        db
          .select({ key: schema.media.key })
          .from(schema.media)
          .where(inArray(schema.media.id, ids)),
      );
      await observeDbOperation("media.destroy.delete", "delete", () =>
        db.delete(schema.media).where(inArray(schema.media.id, ids)),
      );
      const keys = media
        .map((item) => item.key)
        .filter((key): key is string => Boolean(key));
      if (keys.length) {
        await S3.deleteMultipleObject({ Objects: keys.map((Key) => ({ Key })) });
      }
      return { success: true } as const;
    },
  };
}
