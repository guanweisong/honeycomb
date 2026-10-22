import "server-only";
import type { MediaPersistence } from "./media-repository";
import type { MediaStorage } from "../types/media.storage";
import type { MediaDeleteResult } from "../types/media.delete";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";
import { ApplicationError } from "@/lib/errors/application-error";

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
