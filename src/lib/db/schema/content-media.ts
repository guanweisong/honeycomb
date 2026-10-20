import { MEDIA_STATES, MEDIA_ERROR_CODES } from "@/features/media/lifecycle";
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
    state: text("state", { enum: MEDIA_STATES }).notNull().default("UPLOADING"),
    uploadKey: text("upload_key"),
    uploadExpiresAt: text("upload_expires_at"),
    copyStartedAt: text("copy_started_at"),
    uploadedBy: text("uploaded_by"),
    verifiedAt: text("verified_at"),
    lastAttemptAt: text("last_attempt_at"),
    lastErrorCode: text("last_error_code", { enum: MEDIA_ERROR_CODES }),
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
    mediaStateCheck: check(
      "media_state_check",
      sql`${table.state} in (${sql.raw(MEDIA_STATES.map((value) => `'${value}'`).join(","))})`,
    ),
    mediaErrorCheck: check(
      "media_error_check",
      sql`${table.lastErrorCode} is null or ${table.lastErrorCode} in (${sql.raw(MEDIA_ERROR_CODES.map((value) => `'${value}'`).join(","))})`,
    ),
    mediaStateIdx: index("media_state_idx").on(table.state),
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
