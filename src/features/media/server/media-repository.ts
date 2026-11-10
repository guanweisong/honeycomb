import "server-only";
import { eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import { clientEnv } from "@/env/client";
import { Permission } from "@/lib/auth/permissions";
import { requireActiveActor } from "@/features/user/server/require-active-actor";
import { ApplicationError } from "@/lib/errors/application-error";
import { buildDrizzleOrderBy } from "@/lib/db/query/query-builders";
import { MediaRecordSchema } from "@/features/media/schemas/media.record.schema";
import type { MediaRecord } from "@/features/media/types/media.record";
import type { MediaListInput } from "@/features/media/types/media.list";
import type { UploadIntent } from "@/features/media/server/upload-intent";
import type { validateMediaImage } from "@/features/media/server/image-validation";
import { assertOrdinaryMediaSchema } from "@/features/media/server/media-schema-readiness";
import { findKnownMediaReferences } from "@/features/media/server/media-references";
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
async function findRow(tx: Transaction, id: string) {
  const [row] = await tx
    .select()
    .from(schema.media)
    .where(eq(schema.media.id, id))
    .limit(1);
  return row ? MediaRecordSchema.parse(row) : null;
}
export function createMediaRepository(db: Database) {
  return {
    async authorizeUpload(actorId: string) {
      await db.transaction(async (tx) => {
        await requireActiveActor(
          tx,
          actorId,
          [Permission.mediaUpload],
          "当前账户无权操作媒体",
        );
        await assertOrdinaryMediaSchema(tx);
      });
    },
    async findRegistered(id: string, actorId: string) {
      return db.transaction(async (tx) => {
        await requireActiveActor(
          tx,
          actorId,
          [Permission.mediaUpload],
          "当前账户无权操作媒体",
        );
        await assertOrdinaryMediaSchema(tx);
        return findRow(tx, id);
      });
    },
    async insertRegistered(
      intent: UploadIntent,
      key: string,
      metadata: Awaited<ReturnType<typeof validateMediaImage>>,
      actorId: string,
    ) {
      const assetUrl = clientEnv.NEXT_PUBLIC_ASSET_URL;
      if (!assetUrl) throw new Error("Public asset URL is not configured");
      return db.transaction(async (tx) => {
        await requireActiveActor(
          tx,
          actorId,
          [Permission.mediaUpload],
          "当前账户无权操作媒体",
        );
        await assertOrdinaryMediaSchema(tx);
        if (intent.actorId !== actorId)
          throw new ApplicationError("FORBIDDEN", "无权登记此上传");
        const existing = await findRow(tx, intent.id);
        if (existing) return existing;
        await tx
          .insert(schema.media)
          .values({
            id: intent.id,
            name: intent.name,
            key,
            url: `${assetUrl.replace(/\/$/, "")}/${key}`,
            ...metadata,
          })
          .onConflictDoNothing({ target: schema.media.id });
        const registered = await findRow(tx, intent.id);
        if (!registered) throw new Error("Media registration not confirmed");
        return registered;
      });
    },
    async list(input: MediaListInput) {
      await assertOrdinaryMediaSchema(db);
      const { page = 1, limit = 10, sortField, sortOrder } = input;
      const [rows, count] = await Promise.all([
        db
          .select()
          .from(schema.media)
          .orderBy(
            buildDrizzleOrderBy(
              schema.media,
              sortField,
              sortOrder,
              "createdAt",
            ),
          )
          .limit(limit)
          .offset((page - 1) * limit),
        db.select({ count: sql<number>`count(*)` }).from(schema.media),
      ]);
      return {
        list: rows.map((row) => MediaRecordSchema.parse(row)),
        total: Number(count[0]?.count ?? 0),
      };
    },
    async deleteWithStorage(
      ids: string[],
      actorId: string,
      removeObjects: (rows: MediaRecord[]) => Promise<void>,
      signal?: AbortSignal,
    ) {
      // libSQL's default transaction mode is write: it serializes this boundary with content writes.
      await db.transaction(async (tx) => {
        signal?.throwIfAborted();
        await requireActiveActor(
          tx,
          actorId,
          [Permission.mediaDelete],
          "当前账户无权操作媒体",
        );
        signal?.throwIfAborted();
        await assertOrdinaryMediaSchema(tx);
        signal?.throwIfAborted();
        if (!ids.length) return;
        const rows = await tx
          .select()
          .from(schema.media)
          .where(inArray(schema.media.id, ids));
        if (await findKnownMediaReferences(tx, rows, signal))
          throw new ApplicationError(
            "CONFLICT",
            "媒体仍被内容引用，请先移除引用",
          );
        await removeObjects(rows.map((row) => MediaRecordSchema.parse(row)));
        signal?.throwIfAborted();
        await tx.delete(schema.media).where(inArray(schema.media.id, ids));
        signal?.throwIfAborted();
      });
    },
  };
}
export type MediaPersistence = ReturnType<typeof createMediaRepository>;
