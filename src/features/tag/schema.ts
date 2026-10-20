import { z } from "zod";

import { I18nSchema, hasUpdateFields } from "@/lib/validation/validation";

import { IdSchema } from "@/lib/validation/id.schema";

import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";

import type { CleanZod } from "@/lib/validation/validation";

import { queryString } from "@/lib/validation/query.string.schema";

import { MAX_BATCH_SIZE } from "@/lib/validation/resource-limits";

/** 标签写入字段的唯一运行时契约。 */
export const TagInsertSchema = z.object({ name: I18nSchema });
export const TagUpdateSchema = TagInsertSchema.partial()
  .extend({ id: IdSchema })
  .refine(hasUpdateFields, "至少修改一个字段");
export type TagInsert = z.output<typeof TagInsertSchema>;
export type TagUpdate = z.output<typeof TagUpdateSchema>;

/**
 * 获取标签列表时的查询参数验证 schema。
 * 该 schema 扩展了通用的分页查询 schema (`PaginationQuerySchema`)。
 * 允许通过 'name' 字段对标签列表进行筛选。
 */
export const TagListQuerySchema = PaginationQuerySchema.extend({
  id: IdSchema.array().max(MAX_BATCH_SIZE).optional(),
  name: queryString(),
}).partial();

/**
 * 标签列表查询参数的 TypeScript 类型。
 * 从 `TagListQuerySchema` 推断而来。
 */
export type TagListQueryInput = CleanZod<typeof TagListQuerySchema>;
