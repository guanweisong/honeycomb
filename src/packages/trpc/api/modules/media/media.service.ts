import "server-only";

import { format } from "date-fns";
import { inArray, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { clientEnv } from "@/env/client";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/trpc/api/utils/tools";
import S3 from "@/packages/trpc/api/utils/s3";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import type { MediaIndexInput } from "./schemas/media.list.query.schema";

/** 查询媒体列表。 */
export async function getMediaList(db: Database, input: MediaIndexInput) {
  const { page = 1, limit = 10, sortField, sortOrder, ...rest } = input;
  const where = buildDrizzleWhere(schema.media, rest, []);
  const orderBy = buildDrizzleOrderBy(
    schema.media,
    sortField,
    sortOrder as "asc" | "desc",
    "createdAt",
  );
  const [list, countRows] = await Promise.all([
    observeDbOperation("media.list", "select", () =>
      db
        .select()
        .from(schema.media)
        .where(where)
        .orderBy(orderBy)
        .limit(limit)
        .offset((page - 1) * limit),
    ),
    observeDbOperation("media.count", "select", () =>
      db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.media)
        .where(where),
    ),
  ]);
  return { list, total: Number(countRows[0]?.count) || 0 };
}

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
  input: Record<string, unknown>,
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
      } as typeof schema.media.$inferInsert)
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
  if (keys.length)
    await S3.deleteMultipleObject({ Objects: keys.map((Key) => ({ Key })) });
  return { success: true as const };
}
