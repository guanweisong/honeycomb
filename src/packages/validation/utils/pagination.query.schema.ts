import { z } from "zod";

/**
 * 排序顺序的枚举。
 * - `desc`: 降序
 * - `asc`: 升序
 */
export enum SortOrder {
  desc = "desc",
  asc = "asc",
}

const SortOrderEnum = z.nativeEnum(SortOrder);

/**
 * 通用的分页和排序查询参数验证 schema。
 * 可被其他列表查询 schema 继承，以快速实现分页和排序功能。
 *
 * 包含以下字段：
 * - `page`: 当前页码。最小为 1，默认为 1。
 * - `limit`: 每页记录数。最小为 1，默认为 10。
 * - `sortField`: 用于排序的字段名。默认为 "updatedAt"。
 * - `sortOrder`: 排序顺序（'desc' 或 'asc'）。默认为 'desc'（降序）。
 */
export const PaginationQuerySchema = z.object({
  page: z.number().min(1, "最小页码是1").optional().default(1),
  limit: z.number().min(1, "最小查询1条记录").optional().default(10),
  sortField: z.string().optional().default("updatedAt"),
  sortOrder: SortOrderEnum.optional().default(SortOrder.desc),
});

