import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";
import {
  queryString,
  QueryStringArraySchema,
} from "@/lib/validation/query.string.schema";
import {
  hasUpdateFields,
  I18nSchema,
  type CleanZod,
} from "@/lib/validation/validation";
import { IdSchema } from "@/lib/validation/id.schema";
import { PageTemplate } from "@/features/page/page-template";
import { z } from "zod";
import { PageStatus } from "@/features/page/page-status";

/**
 * 新增独立页面时的数据验证 schema，不依赖数据库表结构。
 */
export const PageInsertSchema = z.object({
  title: I18nSchema,
  content: I18nSchema,
  status: z.enum(PageStatus).optional(),
  template: z.enum(PageTemplate),
});

export type PageInsert = z.output<typeof PageInsertSchema>;

export const PageUpdateSchema = PageInsertSchema.partial()
  .extend({ id: IdSchema })
  .refine(hasUpdateFields, "至少修改一个字段");

export type PageUpdate = z.output<typeof PageUpdateSchema>;

/**
 * 获取独立页面列表时的查询参数验证 schema。
 */
export const PageListQuerySchema = PaginationQuerySchema.extend({
  title: queryString(),
  content: queryString(),
  status: QueryStringArraySchema,
}).partial();

/**
 * 独立页面列表查询参数的 TypeScript 类型。
 * 从 `PageListQuerySchema` 推断而来。
 */
export type PageListQueryInput = CleanZod<typeof PageListQuerySchema>;
