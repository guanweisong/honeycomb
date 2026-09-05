import { z } from "zod";
import {
  SortOrder,
  apiPaginationDefaults,
} from "@/packages/application/pagination";
export { SortOrder };
export const PaginationQuerySchema = z.object({
  page: z
    .number()
    .min(1, "最小页码是1")
    .optional()
    .default(apiPaginationDefaults.page),
  limit: z
    .number()
    .min(1, "最小查询1条记录")
    .optional()
    .default(apiPaginationDefaults.limit),
  sortField: z.string().optional().default(apiPaginationDefaults.sortField),
  sortOrder: z
    .enum(SortOrder)
    .optional()
    .default(apiPaginationDefaults.sortOrder),
});
