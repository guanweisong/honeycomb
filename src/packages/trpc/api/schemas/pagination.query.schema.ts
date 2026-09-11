import { z } from "zod";
import {
  MAX_PAGE_SIZE,
  MAX_QUERY_LENGTH,
} from "@/packages/application/resource-limits";
import {
  SortOrder,
  apiPaginationDefaults,
} from "@/packages/application/pagination";
export { SortOrder };
export const PaginationQuerySchema = z.object({
  page: z
    .number()
    .int()
    .min(1, "最小页码是1")
    .optional()
    .default(apiPaginationDefaults.page),
  limit: z
    .number()
    .int()
    .max(MAX_PAGE_SIZE)
    .min(1, "最小查询1条记录")
    .optional()
    .default(apiPaginationDefaults.limit),
  sortField: z
    .string()
    .max(MAX_QUERY_LENGTH)
    .optional()
    .default(apiPaginationDefaults.sortField),
  sortOrder: z
    .enum(SortOrder)
    .optional()
    .default(apiPaginationDefaults.sortOrder),
});
