import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { MediaUploadIntentInputSchema } from "../schema/media.upload.schema";
import { MEDIA_MAX_BYTES } from "../types/media.upload-policy";
import type { MediaUploadIntentInput } from "../types/media.upload";
import type { MediaPersistence } from "./media-repository";
import type { MediaStorage } from "../types/media.storage";
import type { MediaRecord } from "../types/media.record";
import { ApplicationError } from "@/lib/errors/application-error";
import {
  validateMediaImage,
  tryAcquireMediaValidation,
} from "./image-validation";
import { createUploadIntent, verifyUploadIntent } from "./upload-intent";

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
