import type { UserListQuerySchema } from "../schemas/user.list.schema";
import type { PaginationInput } from "@/lib/validation/pagination";
import type { z } from "zod";

// 复用公开过滤字段，但保留内部可选分页与不接受显式 undefined 的边界。
export type UserListInput = PaginationInput & {
  [Key in Exclude<keyof UserListQueryInput, keyof PaginationInput>]?: Exclude<
    UserListQueryInput[Key],
    undefined
  >;
} & {
  // 邮箱仅供内部 repository 查询，不能扩展为公开 API 参数。
  email?: string;
};

export type UserListQueryInput = z.output<typeof UserListQuerySchema>;
