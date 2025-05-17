import { z } from "zod";

export enum SortOrder {
  desc = "desc",
  asc = "asc",
}

const SortOrderEnum = z.nativeEnum(SortOrder);

export const PaginationQuerySchema = z.object({
  page: z.number().min(1, "最小页码是1").optional().default(1),
  limit: z.number().min(1, "最小查询1条记录").optional().default(10),
  sortField: z.string().optional().default("updatedAt"),
  sortOrder: SortOrderEnum.optional().default(SortOrder.desc),
});
