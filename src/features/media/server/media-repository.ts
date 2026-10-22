import "server-only";
import { eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import { clientEnv } from "@/env/client";
import { can, Permission } from "@/lib/auth/permissions";
import { UserStatus } from "@/features/user/user";
import { ApplicationError } from "@/lib/errors/application-error";
import { buildDrizzleOrderBy } from "@/lib/db/query/query-builders";
import { MediaRecordSchema } from "../schema";
import type { MediaRecord, MediaListInput } from "../types";
import type { UploadIntent } from "./upload-intent";
import type { validateMediaImage } from "./image-validation";
import { assertOrdinaryMediaSchema } from "./media-schema-readiness";
import { findKnownMediaReferences } from "./media-references";
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
async function requireActor(
  tx: Transaction,
  actorId: string,
  permission: Permission,
) {
  const [actor] = await tx
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, actorId))
    .limit(1);
  if (
    !actor ||
    actor.status !== UserStatus.ENABLE ||
    !can(actor.level, permission)
  )
    throw new ApplicationError("FORBIDDEN", "当前账户无权操作媒体");
}
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
        await requireActor(tx, actorId, Permission.mediaUpload);
        await assertOrdinaryMediaSchema(tx);
      });
    },
    async findRegistered(id: string, actorId: string) {
      return db.transaction(async (tx) => {
        await requireActor(tx, actorId, Permission.mediaUpload);
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
        await requireActor(tx, actorId, Permission.mediaUpload);
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
    ) {
      // libSQL's default transaction mode is write: it serializes this boundary with content writes.
      await db.transaction(async (tx) => {
        await requireActor(tx, actorId, Permission.mediaDelete);
        await assertOrdinaryMediaSchema(tx);
        if (!ids.length) return;
        const rows = await tx
          .select()
          .from(schema.media)
          .where(inArray(schema.media.id, ids));
        if (await findKnownMediaReferences(tx, rows))
          throw new ApplicationError(
            "CONFLICT",
            "媒体仍被内容引用，请先移除引用",
          );
        await removeObjects(rows.map((row) => MediaRecordSchema.parse(row)));
        await tx.delete(schema.media).where(inArray(schema.media.id, ids));
      });
    },
  };
}
export type MediaPersistence = ReturnType<typeof createMediaRepository>;
