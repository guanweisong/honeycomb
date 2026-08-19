import "server-only";

import { format } from "date-fns";
import S3 from "@/packages/infrastructure/storage/S3";
import type { MediaInsert, MediaRepository } from "../infrastructure/media-repository";

export type { MediaInsert } from "../infrastructure/media-repository";

/** 生成媒体对象的预签名上传地址。 */
export async function getMediaPresignedUrl(name: string, type: string) {
  const ext = name.split(".").pop();
  const key = `${format(new Date(), "yyyy/MM/dd/HHmmssSSS")}.${ext}`;
  return {
    url: await S3.getPresignedUrl({ Key: key, ContentType: type }),
    key,
  };
}

/** 保存媒体元数据。 */
export function createMedia(repository: MediaRepository, input: MediaInsert) {
  return repository.create(input);
}

/** 删除媒体记录及对象存储文件。 */
export function destroyMedia(repository: MediaRepository, ids: string[]) {
  return repository.destroy(ids);
}
