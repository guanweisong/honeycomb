import { format } from "date-fns";
import { MediaUploadFileSchema } from "./upload-policy";
import { MediaInsertSchema } from "./write-schema";
import { MediaCreateRejectedError, type MediaCreateResult } from "./upload-result";
import type {
  MediaInsert,
  MediaListInput,
  MediaRepository,
} from "./repository";
import type { PublicContentInvalidator } from "@/packages/application/public-content-invalidator";
import type { MediaDeleteResult } from "./delete-result";

export interface MediaStorage {
  getPresignedUrl(input: { Key: string; ContentType: string; ContentLength: number }): Promise<string>;
  getPresignedDeleteUrl(key: string): Promise<string>;
  deleteObjects(keys: readonly string[]): Promise<void>;
}

const mediaDeletionInvalidation = {
  refreshLayout: true,
  refreshPostIndex: true,
} as const;

/** 生成媒体对象的预签名上传地址用例。 */
export async function getMediaPresignedUrl(
  storage: MediaStorage,
  name: string,
  type: string,
  size: number,
) {
  const file = MediaUploadFileSchema.parse({ name, type, size });
  const ext = name.split(".").pop();
  const key = `${format(new Date(), "yyyy/MM/dd")}/${crypto.randomUUID()}.${ext}`;
  return {
    url: await storage.getPresignedUrl({ Key: key, ContentType: file.type, ContentLength: file.size }),
    cleanupUrl: await storage.getPresignedDeleteUrl(key),
    key,
  };
}

/** 保存媒体元数据用例。 */
export async function createMedia(repository: Pick<MediaRepository, "create">, input: MediaInsert): Promise<MediaCreateResult> {
  const validated = MediaInsertSchema.parse(input);
  try {
    return { state: "created", media: await repository.create(validated) };
  } catch (error) {
    return error instanceof MediaCreateRejectedError
      ? { state: "rejected", message: "媒体信息未保存" }
      : { state: "indeterminate", message: "保存结果待确认，请刷新媒体列表后核对" };
  }
}

/** 删除媒体记录及对象存储文件用例。 */
export async function destroyMedia(
  repository: Pick<MediaRepository, "findDeleteTargets" | "deleteRecords">,
  storage: Pick<MediaStorage, "deleteObjects">,
  ids: string[],
  invalidator: Pick<PublicContentInvalidator, "invalidate">,
): Promise<MediaDeleteResult> {
  const targets = await repository.findDeleteTargets(ids);
  if (targets.length === 0) {
    if (ids.length > 0) {
      await invalidator.invalidate(mediaDeletionInvalidation);
    }
    return { success: true } as const;
  }
  await storage.deleteObjects(targets.map(({ key }) => key));
  let result: { success: true };
  try {
    result = await repository.deleteRecords(targets.map(({ id }) => id));
  } catch {
    return {
      success: false,
      state: "indeterminate",
      message: "删除结果待确认，请刷新媒体列表后重试",
    };
  }
  await invalidator.invalidate(mediaDeletionInvalidation);
  return result;
}

/** 查询媒体列表用例。 */
export function getMediaList(
  repository: Pick<MediaRepository, "list">,
  input: MediaListInput,
) {
  return repository.list(input);
}
