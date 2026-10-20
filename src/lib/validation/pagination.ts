/** 列表查询共用契约；Feature 只扩展自己的过滤字段。 */
export enum SortOrder {
  desc = "desc",
  asc = "asc",
}

export interface PaginationInput {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: `${SortOrder}`;
}

export const paginationDefaults = {
  page: 1,
  limit: 10,
  sortOrder: SortOrder.desc,
} as const;

// 两种入口的既有排序策略不同，显式保留，不在去重时改变结果顺序。
export const apiPaginationDefaults = {
  ...paginationDefaults,
  sortField: "updatedAt",
} as const;
export const repositoryPaginationDefaults = {
  ...paginationDefaults,
  sortField: "createdAt",
} as const;
