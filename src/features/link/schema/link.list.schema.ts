import { z } from "zod";
import { EnableStatus } from "@/lib/validation/enable-status";
import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";
import {
  QueryStringArraySchema,
  queryString,
} from "@/lib/validation/query.string.schema";

/**
 * 获取友情链接列表时的查询参数验证 schema。
 */
export const LinkListQuerySchema = PaginationQuerySchema.extend({
  name: queryString(),
  url: queryString(),
  description: queryString(),
  status: QueryStringArraySchema.pipe(z.array(z.enum(EnableStatus)).optional()),
}).partial();
