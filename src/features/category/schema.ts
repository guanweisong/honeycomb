import {
  I18nSchema,
  requiredString,
  hasUpdateFields,
} from "@/lib/validation/validation";

import { IdSchema } from "@/lib/validation/id.schema";

import { z } from "zod";

import { EnableStatus } from "@/lib/validation/enable-status";

import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";

import { queryString } from "@/lib/validation/query.string.schema";

/**
 * 新增分类时的数据验证 schema，不依赖数据库表结构。
 */
export const CategoryInsertSchema = z.object({
  title: I18nSchema,
  description: I18nSchema,
  parent: z.string().nullable().optional(),
  status: z.enum(EnableStatus, { message: "分类状态不合法" }).optional(),
  path: requiredString("path不能为空"),
});

export type CategoryInsert = z.output<typeof CategoryInsertSchema>;

export const CategoryUpdateSchema = CategoryInsertSchema.partial()
  .extend({ id: IdSchema })
  .refine(hasUpdateFields, "至少修改一个字段");
export type CategoryUpdate = z.output<typeof CategoryUpdateSchema>;

/**
 * 获取分类列表时的查询参数验证 schema。
 * 该 schema 扩展了通用的分页查询 schema (`PaginationQuerySchema`)。
 * 允许通过 'title', 'path', 和 'status' 对分类列表进行筛选。
 * 这些筛选字段的定义复用了 `CategoryUpdateSchema` 中的相应字段。
 */
export const CategoryListQuerySchema = PaginationQuerySchema.extend({
  title: queryString(),
  path: queryString(),
  status: queryString().pipe(z.enum(EnableStatus).optional()),
  id: queryString(),
}).partial();

/** 分类删除没有业务数量上限，仍拒绝空批次与无效 ID。 */
export const CategoryDeleteSchema = z.object({
  ids: IdSchema.array().min(1),
});
