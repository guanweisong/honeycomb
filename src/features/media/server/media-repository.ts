import "server-only";
import { repositoryPaginationDefaults } from "@/lib/validation/pagination";
import { requireWriteResult } from "@/lib/db/value-validation";

import { sql, inArray } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/lib/db/query/query-builders";
import { observeDbOperation } from "@/lib/observability/server";
import { clientEnv } from "@/env/client";
import type {
  MediaInsert,
  MediaListInput,
  MediaRecord,
  MediaDeleteTarget,
} from "../types";
import { MediaCreateRejectedError } from "../upload-result";
export function createMediaRepository(db: Database) {
  return {
    async create(input: MediaInsert): Promise<MediaRecord> {
      const [media] = await observeDbOperation("media.create", "insert", () =>
        db
          .insert(schema.media)
          .values({
            ...input,
            url: `${clientEnv.NEXT_PUBLIC_ASSET_URL}/${input.key}`,
          })
          .returning(),
      ).catch((error: unknown) => {
        // SQLite constraint errors prove the statement was rejected. Network/timeout
        // errors cannot prove rollback and must remain indeterminate to the client.
        let cause = error;
        for (let depth = 0; depth < 3 && cause instanceof Error; depth++) {
          if (
            "code" in cause &&
            typeof cause.code === "string" &&
            /^SQLITE_CONSTRAINT(?:_|$)/.test(cause.code)
          ) {
            throw new MediaCreateRejectedError("Media metadata was rejected", {
              cause: error,
            });
          }
          cause = cause.cause;
        }
        throw error;
      });
      return requireWriteResult(media, "create", "media");
    },
    async list(
      input: MediaListInput,
    ): Promise<{ list: MediaRecord[]; total: number }> {
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
    async findDeleteTargets(ids: string[]): Promise<MediaDeleteTarget[]> {
      return observeDbOperation("media.destroy.select", "select", () =>
        db
          .select({ id: schema.media.id, key: schema.media.key })
          .from(schema.media)
          .where(inArray(schema.media.id, ids)),
      );
    },
    async deleteRecords(ids: string[]) {
      await observeDbOperation("media.destroy.delete", "delete", () =>
        db.transaction(async (tx) => {
          await tx
            .update(schema.post)
            .set({
              version: sql`${schema.post.version} + 1`,
              updatedAt: sql`${schema.post.updatedAt}`,
            })
            .where(inArray(schema.post.coverId, ids));
          await tx.delete(schema.media).where(inArray(schema.media.id, ids));
        }),
      );
      return { success: true } as const;
    },
  };
}

/** Concrete persistence capabilities for the storage/database outcome workflow. */
export type MediaPersistence = ReturnType<typeof createMediaRepository>;
