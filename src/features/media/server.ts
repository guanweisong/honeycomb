import "server-only";
import { createHash, randomUUID } from "node:crypto";
import {
  MediaUploadIntentInputSchema,
  MEDIA_MAX_BYTES,
  type MediaUploadIntentInput,
} from "./upload-policy";
import type { MediaPersistence } from "./server/media-repository";
import type { MediaRecord } from "./types";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";
import type { MediaDeleteResult } from "./delete-result";
import { ApplicationError } from "@/lib/errors/application-error";
import {
  validateMediaImage,
  tryAcquireMediaValidation,
} from "./server/image-validation";
import { createUploadIntent, verifyUploadIntent } from "./server/upload-intent";

export interface MediaStorage {
  getPresignedUrl(input: {
    Key: string;
    ContentType: string;
    ContentLength: number;
  }): Promise<string>;
  putValidatedObject(
    key: string,
    bytes: Uint8Array,
    type: string,
  ): Promise<void>;
  headObject(
    key: string,
  ): Promise<{ size: number | undefined; type: string | undefined } | null>;
  readObject(key: string, maxBytes: number): Promise<Uint8Array>;
  deleteObjects(keys: readonly string[]): Promise<void>;
}
/** A signed temporary capability only: no provisional media record. */
export async function prepareMediaUpload(
  repository: Pick<MediaPersistence, "authorizeUpload">,
  storage: Pick<MediaStorage, "getPresignedUrl">,
  input: MediaUploadIntentInput,
  actorId: string,
) {
  const file = MediaUploadIntentInputSchema.parse(input);
  await repository.authorizeUpload(actorId);
  const { intent, payload } = createUploadIntent(file, actorId);
  return {
    intent,
    uploadUrl: await storage.getPresignedUrl({
      Key: payload.uploadKey,
      ContentType: payload.type,
      ContentLength: payload.size,
    }),
    expiresAt: new Date(payload.expiresAt).toISOString(),
  };
}
/** Validate once, PUT the exact bytes once, then register. Unknown results are never recovered or cleaned automatically. */
export async function registerMediaUpload(
  repository: Pick<MediaPersistence, "findRegistered" | "insertRegistered">,
  storage: MediaStorage,
  intent: string,
  actorId: string,
): Promise<MediaRecord> {
  const payload = verifyUploadIntent(intent, actorId);
  // The repository checks current permission before returning even an existing row.
  const existing = await repository.findRegistered(payload.id, actorId);
  if (existing) return existing;
  const release = tryAcquireMediaValidation();
  if (!release)
    throw new ApplicationError("CONFLICT", "图片验证繁忙，请稍后手动重试");
  try {
    let bytes: Uint8Array;
    try {
      bytes = await storage.readObject(payload.uploadKey, MEDIA_MAX_BYTES);
    } catch {
      throw new ApplicationError(
        "INTERNAL_SERVER_ERROR",
        "无法读取临时图片，请检查上传后手动重试",
      );
    }
    if (
      bytes.byteLength !== payload.size ||
      createHash("sha256").update(bytes).digest("hex") !== payload.sha256
    )
      throw new ApplicationError(
        "BAD_REQUEST",
        "图片大小或摘要不匹配，请重新上传",
      );
    let metadata: Awaited<ReturnType<typeof validateMediaImage>>;
    try {
      metadata = await validateMediaImage(bytes, payload);
    } catch {
      throw new ApplicationError(
        "BAD_REQUEST",
        "图片内容未通过验证，请重新上传",
      );
    }
    const key = `media/${randomUUID()}.${payload.name.split(".").at(-1)?.toLowerCase()}`;
    try {
      await storage.putValidatedObject(key, bytes, metadata.type);
    } catch {
      throw new ApplicationError(
        "INTERNAL_SERVER_ERROR",
        "对象写入结果无法确认，可能留下孤立文件；请人工核对或手动重试",
      );
    }
    try {
      return await repository.insertRegistered(payload, key, metadata, actorId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      throw new ApplicationError(
        "INTERNAL_SERVER_ERROR",
        "媒体登记结果无法确认，文件或记录可能已存在；请人工核对或手动重试",
      );
    }
  } finally {
    release();
  }
}
/** Hold the serialized database write transaction through whole-batch reference checks and storage deletion. */
export async function destroyMedia(
  repository: Pick<MediaPersistence, "deleteWithStorage">,
  storage: Pick<MediaStorage, "deleteObjects" | "headObject">,
  ids: string[],
  invalidator: PublicContentInvalidator,
  actorId: string,
  acknowledgeUnknownReferences: boolean,
): Promise<MediaDeleteResult> {
  if (!acknowledgeUnknownReferences)
    throw new ApplicationError(
      "BAD_REQUEST",
      "请确认删除可能破坏未登记的历史或外部引用",
    );
  try {
    await repository.deleteWithStorage(ids, actorId, async (rows) => {
      const keys = [...new Set(rows.map((row) => row.key))];
      if (keys.length === 0) return;
      await storage.deleteObjects(keys);
      for (let offset = 0; offset < keys.length; offset += 8) {
        const results = await Promise.allSettled(
          keys.slice(offset, offset + 8).map((key) => storage.headObject(key)),
        );
        if (
          results.some(
            (result) => result.status === "rejected" || result.value !== null,
          )
        )
          throw new Error("Object absence not confirmed");
      }
    });
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    throw new ApplicationError(
      "INTERNAL_SERVER_ERROR",
      "删除结果无法确认，可能已部分删除或留下失效记录；请人工核对后手动重试",
    );
  }
  let publicSync: "completed" | "degraded" = "degraded";
  try {
    publicSync = (
      await invalidator.invalidate({
        refreshLayout: true,
        refreshPostIndex: true,
      })
    ).state;
  } catch {
    /* Committed deletion remains successful even when cache invalidation fails. */
  }
  return { success: true, publicSync };
}
