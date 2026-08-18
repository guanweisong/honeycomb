import "server-only";

import { format } from "date-fns";
import { inArray } from "drizzle-orm";
import { clientEnv } from "@/env/client";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import S3 from "@/packages/infrastructure/storage/S3";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

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
export async function createMedia(
  db: Database,
  input: Pick<
    typeof schema.media.$inferInsert,
    "name" | "size" | "type" | "key" | "width" | "height" | "color"
  >,
) {
  const { name, size, type, key, width, height, color } = input;
  const [media] = await observeDbOperation("media.create", "insert", () =>
    db
      .insert(schema.media)
      .values({
        name,
        size,
        type,
        key,
        url: `${clientEnv.NEXT_PUBLIC_ASSET_URL}/${key}`,
        width,
        height,
        color,
      })
      .returning(),
  );
  return media;
}

/** 删除媒体记录及对象存储文件。 */
export async function destroyMedia(db: Database, ids: string[]) {
  const media = await observeDbOperation("media.destroy.select", "select", () =>
    db
      .select({ key: schema.media.key })
      .from(schema.media)
      .where(inArray(schema.media.id, ids)),
  );
  await observeDbOperation("media.destroy.delete", "delete", () =>
    db.delete(schema.media).where(inArray(schema.media.id, ids)),
  );
  const keys = media
    .map((item) => item.key)
    .filter((key): key is string => Boolean(key));
  if (keys.length) {
    await S3.deleteMultipleObject({ Objects: keys.map((Key) => ({ Key })) });
  }
  return { success: true as const };
}
