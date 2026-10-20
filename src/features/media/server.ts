import "server-only";
import { MediaUploadFileSchema, MEDIA_MAX_BYTES } from "./upload-policy";
import type { MediaUploadFile } from "./upload-policy";
import type { MediaPersistence } from "./server/media-repository";
import { MediaRecordSchema, type MediaConfirmResult } from "./types";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";
import type { MediaDeleteResult } from "./delete-result";
import { ApplicationError } from "@/lib/errors/application-error";
import {
  validateMediaImage,
  tryAcquireMediaValidation,
} from "./server/image-validation";

export interface MediaStorage {
  getPresignedUrl(input: {
    Key: string;
    ContentType: string;
    ContentLength: number;
  }): Promise<string>;
  copyCandidate(source: string, candidate: string, type: string): Promise<void>;
  headObject(
    key: string,
  ): Promise<{ size: number | undefined; type: string | undefined } | null>;
  readObject(key: string, maxBytes: number): Promise<Uint8Array>;
  deleteObjects(keys: readonly string[]): Promise<void>;
}
export async function beginMediaUpload(
  repository: Pick<MediaPersistence, "begin">,
  storage: Pick<MediaStorage, "getPresignedUrl">,
  input: MediaUploadFile,
  actorId: string,
) {
  const row = await repository.begin(
    MediaUploadFileSchema.parse(input),
    actorId,
  );
  if (!row.uploadKey || !row.uploadExpiresAt)
    throw new Error("Missing upload capability target");
  return {
    id: row.id,
    uploadUrl: await storage.getPresignedUrl({
      Key: row.uploadKey,
      ContentType: row.type,
      ContentLength: row.size,
    }),
    expiresAt: row.uploadExpiresAt,
  };
}
export async function confirmMediaUpload(
  repository: Pick<
    MediaPersistence,
    "findForUpload" | "claimCopy" | "bindReady" | "note"
  >,
  storage: MediaStorage,
  id: string,
  actorId: string,
): Promise<MediaConfirmResult> {
  const row = await repository.findForUpload(id, actorId);
  if (row.state === "READY")
    return { state: "ready", media: MediaRecordSchema.parse(row) };
  if (row.state !== "UPLOADING")
    throw new ApplicationError("CONFLICT", "此媒体已进入删除流程");
  const pending = async (
    code: "STORAGE_PENDING" | "DATABASE_PENDING" = "STORAGE_PENDING",
  ): Promise<MediaConfirmResult> => {
    await repository.note(id, "UPLOADING", code).catch(() => undefined);
    return {
      state: "pending",
      id,
      message: "结果待确认，请稍后核对；请勿删除或覆盖候选对象",
    };
  };
  // Persist claim before the external write. Even an uncertain claim must not cause a COPY.
  let claimed: Awaited<ReturnType<MediaPersistence["claimCopy"]>>;
  try {
    claimed = await repository.claimCopy(id, actorId);
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    return pending("DATABASE_PENDING");
  }
  if (claimed?.uploadKey) {
    try {
      await storage.copyCandidate(claimed.uploadKey, claimed.key, claimed.type);
    } catch {
      /* Inspect candidate. A timeout is not proof of failure. */
    }
  }
  const release = tryAcquireMediaValidation();
  if (!release) return pending();
  try {
    let bytes: Uint8Array;
    try {
      const object = await storage.headObject(row.key);
      if (!object) return pending();
      if (
        object.size === undefined ||
        object.size > MEDIA_MAX_BYTES ||
        object.size !== row.size
      ) {
        await repository
          .note(id, "UPLOADING", "INVALID_IMAGE")
          .catch(() => undefined);
        return {
          state: "rejected",
          id,
          message: "实际文件大小不符合上传规则，请重新上传",
        };
      }
      bytes = await storage.readObject(row.key, MEDIA_MAX_BYTES);
    } catch {
      return pending();
    }
    let metadata: Awaited<ReturnType<typeof validateMediaImage>>;
    try {
      metadata = await validateMediaImage(bytes, {
        size: row.size,
        type: row.type,
      });
    } catch {
      await repository
        .note(id, "UPLOADING", "INVALID_IMAGE")
        .catch(() => undefined);
      return {
        state: "rejected",
        id,
        message: "图片内容未通过验证，请重新上传",
      };
    }
    try {
      const media = await repository.bindReady(id, actorId, metadata);
      if (!media)
        throw new ApplicationError("CONFLICT", "此媒体已进入删除流程");
      return { state: "ready", media };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      return pending("DATABASE_PENDING");
    }
  } finally {
    release();
  }
}

/** Mark first, delete outside the transaction, retain tombstones and original recovery keys. */
export async function destroyMedia(
  repository: Pick<MediaPersistence, "beginDelete" | "finishDelete" | "note">,
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
  const rows = await repository.beginDelete(ids, actorId);
  let pending = false;
  for (const row of rows) {
    try {
      // A previously ambiguous delete may already have succeeded.
      if (await storage.headObject(row.key))
        await storage.deleteObjects([row.key]);
      if (await storage.headObject(row.key))
        throw new Error("Object still exists");
      await repository.finishDelete(row.id);
    } catch {
      pending = true;
      await repository
        .note(row.id, "DELETING", "DELETE_PENDING")
        .catch(() => undefined);
    }
  }
  if (pending)
    return {
      success: false,
      state: "indeterminate",
      message: "删除处理中，请稍后查询对象并重试核对",
    };
  let publicSync: "completed" | "degraded" = "degraded";
  try {
    publicSync = (
      await invalidator.invalidate({
        refreshLayout: true,
        refreshPostIndex: true,
      })
    ).state;
  } catch {
    /* Committed deletion is not an invitation to repeat destructive work. */
  }
  return { success: true, publicSync };
}
