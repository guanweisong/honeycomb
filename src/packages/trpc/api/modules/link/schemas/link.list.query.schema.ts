import { PaginationQuerySchema } from "@/packages/trpc/api/schemas/pagination.query.schema";
import { CleanZod } from "../../../schemas/clean.zod";
import { z } from "zod";
import { queryString } from "@/packages/trpc/api/schemas/query.string.schema";

/**
 * 获取友情链接列表时的查询参数验证 schema。
 */
export const LinkListQuerySchema = PaginationQuerySchema.extend({
  name: queryString(),
  url: queryString(),
  description: queryString(),
  status: z.array(z.string()).optional(),
}).partial();

/**
 * 友情链接列表查询参数的 TypeScript 类型。
 * 从 `LinkListQuerySchema` 推断而来。
 */
export type LinkListQueryInput = CleanZod<typeof LinkListQuerySchema>;
