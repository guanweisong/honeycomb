import { requiredString } from "@/packages/application/validation";
import { z } from "zod";
import { MediaUploadFileSchema } from "./upload-policy";

/**
 * 新增上传文件时的数据验证 schema，不依赖数据库表结构。
 */
export const MediaInsertSchema = MediaUploadFileSchema.safeExtend({
  key: requiredString("Key 不能为空"),
  color: z.string().nullable().optional(),
  height: z.number().int().nullable().optional(),
  width: z.number().int().nullable().optional(),
});

/**
 * 媒体写入数据类型。
 * 由 MediaInsertSchema 推导，避免与读取侧 MediaViewModel 混淆。
 */
export type MediaInsert = z.output<typeof MediaInsertSchema>;
