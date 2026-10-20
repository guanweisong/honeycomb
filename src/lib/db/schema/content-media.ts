import {
  sqliteTable,
  text,
  integer,
  index,
  check,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { objectId } from "../object-id";
import { withTimestamps } from "../timestamps";

/**
 * 媒体文件表 (media)
 * 存储上传的图片、视频等媒体文件信息。
 */
export const media = sqliteTable(
  "media",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    key: text("key").notNull(), // 文件在对象存储中的 key
    name: text("name").notNull(), // 文件名
    size: integer("size").notNull(), // 文件大小 (字节)
    type: text("type").notNull(), // 文件 MIME 类型
    url: text("url").notNull(), // 文件的访问 URL
    color: text("color"), // 图片主色调
    height: integer("height"), // 图片高度
    width: integer("width"), // 图片宽度
    ...withTimestamps(),
  },
  (table) => ({
    mediaKeyIdx: index("media_key_idx").on(table.key),
    mediaCreatedIdx: index("media_created_idx").on(table.createdAt),
    mediaSizeCheck: check("media_size_check", sql`${table.size} >= 0`),
    mediaHeightCheck: check(
      "media_height_check",
      sql`${table.height} is null or ${table.height} >= 0`,
    ),
    mediaWidthCheck: check(
      "media_width_check",
      sql`${table.width} is null or ${table.width} >= 0`,
    ),
  }),
);
