import { PaginationQuerySchema } from "../../utils/pagination.query.schema";
import { CleanZod } from "../../utils/clean.zod";
import { queryString } from "@/packages/validation/utils/query.string.schema";
import { z } from "zod";

/**
 * 获取独立页面列表时的查询参数验证 schema。
 */
export const PageListQuerySchema = PaginationQuerySchema.extend({
  title: queryString(),
  content: queryString(),
  status: z.array(z.string()).optional(),
});

/**
 * 独立页面列表查询参数的 TypeScript 类型。
 * 从 `PageListQuerySchema` 推断而来。
 */
export type PageListQueryInput = CleanZod<typeof PageListQuerySchema>;
