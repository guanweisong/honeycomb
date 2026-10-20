import { MAX_BATCH_SIZE } from "@/lib/validation/resource-limits";
import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";
import {
  queryString,
  QueryStringArraySchema,
} from "@/lib/validation/query.string.schema";
import { I18nSchema, type CleanZod } from "@/lib/validation/validation";
import { IdSchema } from "@/lib/validation/id.schema";
import { PageTemplate } from "@/features/page/page-template";
import { z } from "zod";
import { PageStatus } from "@/features/page/page-status";

/**
 * 新增独立页面时的数据验证 schema，不依赖数据库表结构。
 */
export const PageFieldsSchema = z.strictObject({
  title: I18nSchema,
  content: I18nSchema,
  status: z.enum(PageStatus).optional(),
  template: z.enum(PageTemplate),
});

export type PageFields = z.output<typeof PageFieldsSchema>;
export const PageInsertSchema = PageFieldsSchema.extend({
  creationToken: z.uuid(),
});
export type PageInsert = z.output<typeof PageInsertSchema>;
const version = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const PageUpdateSchema = PageFieldsSchema.partial()
  .extend({ id: IdSchema, expectedVersion: version })
  .refine(
    (value) =>
      Object.entries(value).some(
        ([key, field]) =>
          key !== "id" && key !== "expectedVersion" && field !== undefined,
      ),
    "至少修改一个字段",
  );
export type PageUpdate = z.output<typeof PageUpdateSchema>;
export const PageDeleteSchema = z.strictObject({
  items: z
    .array(z.strictObject({ id: IdSchema, expectedVersion: version }))
    .min(1)
    .max(MAX_BATCH_SIZE)
    .refine(
      (items) => new Set(items.map(({ id }) => id)).size === items.length,
      "页面不能重复",
    ),
});
export type PageDelete = z.output<typeof PageDeleteSchema>;
export const PageCreationResultInputSchema = z.strictObject({
  creationToken: z.uuid(),
});

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
