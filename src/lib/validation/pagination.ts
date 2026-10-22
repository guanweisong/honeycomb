import type { z } from "zod";
import type { PaginationQuerySchema } from "./pagination.query.schema";

/** 列表查询共用契约；Feature 只扩展自己的过滤字段。 */
export enum SortOrder {
  desc = "desc",
  asc = "asc",
}

// 解析前字段仍可缺省；保留 exactOptionalPropertyTypes 下不接受显式 undefined 的契约。
export type PaginationInput = {
  [
    Field in keyof Omit<z.input<typeof PaginationQuerySchema>, "sortOrder">
  ]?: Exclude<z.input<typeof PaginationQuerySchema>[Field], undefined>;
} & {
  // Repository 同时接受普通字符串字面量，不收紧为 Zod 的 enum 输入。
  sortOrder?: `${NonNullable<z.input<typeof PaginationQuerySchema>["sortOrder"]>}`;
};

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
