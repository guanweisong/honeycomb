import { PaginationQuerySchema } from "@honeycomb/validation/schemas/pagination.query.schema";
import { LinkInsertSchema } from "@honeycomb/validation/link/schemas/link.insert.schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { z } from "zod";

/**
 * 获取友情链接列表时的查询参数验证 schema。
 * 1. 扩展了通用的分页查询 schema (`PaginationQuerySchema`)。
 * 2. 添加了 'name', 'url', 'description' 作为可选的筛选字段。
 * 3. 特别地，它重写了 'status' 字段，使其可以接受一个字符串数组。
 *    这允许客户端通过提供多个状态值来筛选链接，例如 `?status=approved&status=pending`。
 */
export const LinkListQuerySchema = PaginationQuerySchema.extend({
  name: LinkInsertSchema.shape.name,
  url: LinkInsertSchema.shape.url,
  description: LinkInsertSchema.shape.description,
  status: LinkInsertSchema.shape.status,
})
  .extend({
    status: z.array(z.string()).optional(),
  })
  .partial();

/**
 * 友情链接列表查询参数的 TypeScript 类型。
 * 从 `LinkListQuerySchema` 推断而来。
 */
export type LinkListQueryInput = CleanZod<typeof LinkListQuerySchema>;
