import { hasUpdateFields, requiredString } from "@/lib/validation/validation";

import { z } from "zod";

import { HttpUrlSchema } from "@/lib/validation/http-url-schema";

import { EnableStatus } from "@/lib/validation/enable-status";

import { IdSchema } from "@/lib/validation/id.schema";

import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";

import {
  QueryStringArraySchema,
  queryString,
} from "@/lib/validation/query.string.schema";

/**
 * 新增友情链接时的数据验证 schema。
 * 该 schema 定义创建链接时允许传入的字段，不依赖数据库表结构。
 */
export const LinkInsertSchema = z.object({
  url: HttpUrlSchema,
  status: z.enum(EnableStatus).optional(),
  name: requiredString("链接名称不能为空"),
  logo: HttpUrlSchema,
  description: z.string().trim().optional(),
});

export const LinkUpdateSchema = LinkInsertSchema.partial()
  .extend({ id: IdSchema })
  .refine(hasUpdateFields, "至少修改一个字段");

/**
 * 获取友情链接列表时的查询参数验证 schema。
 */
export const LinkListQuerySchema = PaginationQuerySchema.extend({
  name: queryString(),
  url: queryString(),
  description: queryString(),
  status: QueryStringArraySchema.pipe(z.array(z.enum(EnableStatus)).optional()),
}).partial();
