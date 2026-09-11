import type { CleanZod } from "@/packages/application/validation";
import { PaginationQuerySchema } from "@/packages/trpc/api/schemas/pagination.query.schema";
import { QueryStringArraySchema } from "@/packages/trpc/api/schemas/query.string.schema";
import { queryString } from "@/packages/trpc/api/schemas/query.string.schema";

/**
 * 获取用户列表时的查询参数验证 schema。
 */
export const UserListQuerySchema = PaginationQuerySchema.extend({
  status: QueryStringArraySchema,
  level: QueryStringArraySchema,
  name: queryString(),
}).partial();

/**
 * 用户列表查询参数的 TypeScript 类型。
 * 从 `UserListQuerySchema` 推断而来。
 */
export type UserListQueryInput = CleanZod<typeof UserListQuerySchema>;
