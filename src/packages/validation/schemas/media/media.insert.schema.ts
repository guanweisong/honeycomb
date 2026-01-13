import { createInsertSchema } from "drizzle-zod";
import * as schema from "@/packages/db/schema";
import { CleanZod } from "../../utils/clean.zod";
import { requiredString } from "@/packages/validation/utils/required.string.schema";

/**
 * 新增上传文件时的数据验证 schema。
 */
export const MediaInsertSchema = createInsertSchema(schema.media).extend({
  base64: requiredString("图片不能为空"),
});

/**
 * 媒体实体的 TypeScript 类型。
 * 这是从 MediaInsertSchema 推断出的纯净 TypeScript 类型，用于在代码中方便地引用媒体对象的结构。
 */
export type MediaEntity = CleanZod<typeof MediaInsertSchema>;
