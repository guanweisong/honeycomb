import { PaginationQuerySchema } from "../../schemas/pagination.query.schema";
import { PageInsertSchema } from "@honeycomb/validation/page/schemas/page.insert.schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";

/**
 * 获取独立页面列表时的查询参数验证 schema。
 * 该 schema 扩展了通用的分页查询 schema (`PaginationQuerySchema`)。
 * 允许通过 'title', 'content', 和 'status' 对页面列表进行筛选。
 */
export const PageListQuerySchema = PaginationQuerySchema.extend({
  title: PageInsertSchema.shape.title,
  content: PageInsertSchema.shape.content,
  status: PageInsertSchema.shape.status,
}).partial();

/**
 * 独立页面列表查询参数的 TypeScript 类型。
 * 从 `PageListQuerySchema` 推断而来。
 */
export type PageListQueryInput = CleanZod<typeof PageListQuerySchema>;
