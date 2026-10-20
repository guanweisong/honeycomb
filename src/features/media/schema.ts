import { requiredString } from "@/lib/validation/validation";
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

import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";
import type { CleanZod } from "@/lib/validation/validation";

/**
 * 获取媒体列表时的查询参数验证 schema。
 * 该 schema 扩展了通用的分页查询 schema (`PaginationQuerySchema`)，
 * 但未添加任何额外的筛选字段。因此，它只支持对媒体列表进行分页查询。
 */
export const MediaListQuerySchema = PaginationQuerySchema.partial();

/**
 * 媒体列表查询参数的 TypeScript 类型。
 * 基本上只包含分页参数。
 */
export type MediaIndexInput = CleanZod<typeof MediaListQuerySchema>;
