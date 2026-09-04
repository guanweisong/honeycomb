import { format } from "date-fns";
import type {
  MediaInsert,
  MediaListInput,
  MediaRepository,
} from "./repository";

export interface MediaStorage {
  getPresignedUrl(input: { Key: string; ContentType: string }): Promise<string>;
  deleteObjects(keys: readonly string[]): Promise<void>;
}

/** 生成媒体对象的预签名上传地址用例。 */
export async function getMediaPresignedUrl(
  storage: MediaStorage,
  name: string,
  type: string,
) {
  const ext = name.split(".").pop();
  const key = `${format(new Date(), "yyyy/MM/dd/HHmmssSSS")}.${ext}`;
  return {
    url: await storage.getPresignedUrl({ Key: key, ContentType: type }),
    key,
  };
}

/** 保存媒体元数据用例。 */
export function createMedia(repository: Pick<MediaRepository, "create">, input: MediaInsert) {
  return repository.create(input);
}

/** 删除媒体记录及对象存储文件用例。 */
export async function destroyMedia(
  repository: Pick<MediaRepository, "findDeleteTargets" | "deleteRecords">,
  storage: Pick<MediaStorage, "deleteObjects">,
  ids: string[],
) {
  const targets = await repository.findDeleteTargets(ids);
  if (targets.length === 0) return { success: true } as const;
  await storage.deleteObjects(targets.map(({ key }) => key));
  return repository.deleteRecords(targets.map(({ id }) => id));
}

/** 查询媒体列表用例。 */
export function getMediaList(
  repository: Pick<MediaRepository, "list">,
  input: MediaListInput,
) {
  return repository.list(input);
}
