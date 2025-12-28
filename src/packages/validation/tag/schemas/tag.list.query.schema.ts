import { PaginationQuerySchema } from "@/packages/validation/schemas/pagination.query.schema";
import { CleanZod } from "../../clean.zod";
import { z } from "zod";

/**
 * 获取标签列表时的查询参数验证 schema。
 * 该 schema 扩展了通用的分页查询 schema (`PaginationQuerySchema`)。
 * 允许通过 'name' 字段对标签列表进行筛选。
 */
export const TagListQuerySchema = PaginationQuerySchema.extend({
  name: z.string(),
}).partial();

/**
 * 标签列表查询参数的 TypeScript 类型。
 * 从 `TagListQuerySchema` 推断而来。
 */
export type TagListQueryInput = CleanZod<typeof TagListQuerySchema>;
