import { CleanZod } from "../../utils/clean.zod";
import { PaginationQuerySchema } from "@/packages/validation/utils/pagination.query.schema";
import { z } from "zod";
import { queryString } from "@/packages/validation/utils/query.string.schema";

/**
 * 获取用户列表时的查询参数验证 schema。
 */
export const UserListQuerySchema = PaginationQuerySchema.extend({
  status: z.array(z.string()).optional(),
  level: z.array(z.string()).optional(),
  name: queryString(),
});

/**
 * 用户列表查询参数的 TypeScript 类型。
 * 从 `UserListQuerySchema` 推断而来。
 */
export type UserListQueryInput = CleanZod<typeof UserListQuerySchema>;
