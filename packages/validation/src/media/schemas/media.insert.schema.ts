import { createInsertSchema } from "drizzle-zod";
import { media } from "@honeycomb/db/schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { z } from "zod";

/**
 * 新增上传文件时的数据验证 schema。
 */
export const MediaInsertSchema = createInsertSchema(media).extend({
  base64: z.string(),
});

/**
 * 媒体实体的 TypeScript 类型。
 * 这是从 MediaInsertSchema 推断出的纯净 TypeScript 类型，用于在代码中方便地引用媒体对象的结构。
 */
export type MediaEntity = CleanZod<typeof MediaInsertSchema>;
