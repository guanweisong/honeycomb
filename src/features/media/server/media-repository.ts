import "server-only";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import { clientEnv } from "@/env/client";
import { can, Permission } from "@/lib/auth/permissions";
import { UserStatus } from "@/features/user/user";
import { ApplicationError } from "@/lib/errors/application-error";
import { buildDrizzleOrderBy } from "@/lib/db/query/query-builders";
import {
  MediaManagementRecordSchema,
  MediaRecordSchema,
  type MediaListInput,
} from "../types";
import type { MediaUploadFile } from "../upload-policy";
import type { MediaState, MediaErrorCodeSchema } from "../lifecycle";
import type { z } from "zod";
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
  return actor;
}
async function requireUpload(tx: Transaction, id: string, actorId: string) {
  const actor = await requireActor(tx, actorId, Permission.mediaUpload);
  const [row] = await tx
    .select()
    .from(schema.media)
    .where(eq(schema.media.id, id))
    .limit(1);
  if (!row) throw new ApplicationError("NOT_FOUND", "媒体不存在");
  if (
    row.uploadedBy !== actorId &&
    !can(actor.level, Permission.mediaManageUploads)
  )
    throw new ApplicationError("FORBIDDEN", "无权确认此上传");
  return row;
}
export function createMediaRepository(db: Database) {
  return {
    async begin(file: MediaUploadFile, actorId: string) {
      const assetUrl = clientEnv.NEXT_PUBLIC_ASSET_URL;
      if (!assetUrl) throw new Error("Public asset URL is not configured");
      const id = crypto.randomUUID().replaceAll("-", "").slice(0, 24);
      const suffix = file.name.split(".").at(-1)?.toLowerCase();
      const key = `media/${crypto.randomUUID()}.${suffix}`;
      const uploadKey = `temporary/${crypto.randomUUID()}.${suffix}`;
      const uploadExpiresAt = new Date(Date.now() + 3600_000).toISOString();
      return db.transaction(async (tx) => {
        await requireActor(tx, actorId, Permission.mediaUpload);
        const [row] = await tx
          .insert(schema.media)
          .values({
            ...file,
            id,
            key,
            uploadKey,
            uploadExpiresAt,
            uploadedBy: actorId,
            state: "UPLOADING",
            url: `${assetUrl.replace(/\/$/, "")}/${key}`,
          })
          .returning();
        if (!row) throw new Error("Media upload not created");
        return row;
      });
    },
    async findForUpload(id: string, actorId: string) {
      return db.transaction((tx) => requireUpload(tx, id, actorId));
    },
    async status(id: string, actorId: string) {
      return db.transaction(async (tx) => {
        const actor = await requireActor(tx, actorId, Permission.mediaReadAll);
        const [row] = await tx
          .select()
          .from(schema.media)
          .where(eq(schema.media.id, id))
          .limit(1);
        if (!row) throw new ApplicationError("NOT_FOUND", "媒体不存在");
        if (
          row.state !== "READY" &&
          row.uploadedBy !== actorId &&
          !can(actor.level, Permission.mediaManageUploads)
        )
          throw new ApplicationError("FORBIDDEN", "无权查看此上传");
        return MediaManagementRecordSchema.parse(row);
      });
    },
    async claimCopy(id: string, actorId: string) {
      return db.transaction(async (tx) => {
        await requireUpload(tx, id, actorId);
        const [row] = await tx
          .update(schema.media)
          .set({
            copyStartedAt: new Date().toISOString(),
            lastAttemptAt: new Date().toISOString(),
            lastErrorCode: null,
          })
          .where(
            and(
              eq(schema.media.id, id),
              eq(schema.media.state, "UPLOADING"),
              isNull(schema.media.copyStartedAt),
            ),
          )
          .returning();
        return row ?? null;
      });
    },
    async bindReady(
      id: string,
      actorId: string,
      metadata: {
        size: number;
        type: string;
        width: number;
        height: number;
        color: null;
      },
    ) {
      return db.transaction(async (tx) => {
        await requireUpload(tx, id, actorId);
        const [row] = await tx
          .update(schema.media)
          .set({
            ...metadata,
            state: "READY",
            verifiedAt: new Date().toISOString(),
            lastAttemptAt: new Date().toISOString(),
            lastErrorCode: null,
          })
          .where(
            and(eq(schema.media.id, id), eq(schema.media.state, "UPLOADING")),
          )
          .returning();
        if (row) return MediaRecordSchema.parse(row);
        const current = await requireUpload(tx, id, actorId);
        return current.state === "READY"
          ? MediaRecordSchema.parse(current)
          : null;
      });
    },
    async note(
      id: string,
      state: MediaState,
      code: z.infer<typeof MediaErrorCodeSchema>,
    ) {
      await db
        .update(schema.media)
        .set({ lastAttemptAt: new Date().toISOString(), lastErrorCode: code })
        .where(and(eq(schema.media.id, id), eq(schema.media.state, state)));
    },
    async list(input: MediaListInput, actorId?: string) {
      const {
        page = 1,
        limit = 10,
        sortField,
        sortOrder,
        state = "READY",
      } = input;
      let where = eq(schema.media.state, state);
      if (state !== "READY") {
        if (!actorId)
          throw new ApplicationError("FORBIDDEN", "无权查看待处理媒体");
        const actor = await db.transaction((tx) =>
          requireActor(tx, actorId, Permission.mediaReadAll),
        );
        if (!can(actor.level, Permission.mediaManageUploads))
          where = and(where, eq(schema.media.uploadedBy, actorId)) ?? where;
      }
      const [rows, count] = await Promise.all([
        db
          .select()
          .from(schema.media)
          .where(where)
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
        db
          .select({ count: sql<number>`count(*)` })
          .from(schema.media)
          .where(where),
      ]);
      return {
        list: rows.map((row) => MediaManagementRecordSchema.parse(row)),
        total: Number(count[0]?.count ?? 0),
      };
    },
    async beginDelete(ids: string[], actorId: string) {
      return db.transaction(async (tx) => {
        await requireActor(tx, actorId, Permission.mediaDelete);
        if (!ids.length) return [];
        const rows = await tx
          .select()
          .from(schema.media)
          .where(inArray(schema.media.id, ids));
        if (rows.some((row) => row.state === "UPLOADING"))
          throw new ApplicationError(
            "CONFLICT",
            "上传中的对象需要人工核对，不能直接删除",
          );
        const active = rows.filter((row) => row.state !== "DELETED");
        if (await findKnownMediaReferences(tx, active))
          throw new ApplicationError(
            "CONFLICT",
            "媒体仍被内容引用，请先移除引用",
          );
        if (active.length)
          await tx
            .update(schema.media)
            .set({
              state: "DELETING",
              lastAttemptAt: new Date().toISOString(),
              lastErrorCode: null,
            })
            .where(
              inArray(
                schema.media.id,
                active.map((row) => row.id),
              ),
            );
        return active;
      });
    },
    async finishDelete(id: string) {
      await db
        .update(schema.media)
        .set({
          state: "DELETED",
          lastAttemptAt: new Date().toISOString(),
          lastErrorCode: null,
        })
        .where(
          and(eq(schema.media.id, id), eq(schema.media.state, "DELETING")),
        );
    },
  };
}
export type MediaPersistence = ReturnType<typeof createMediaRepository>;
