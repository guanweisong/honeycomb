import { CleanZod } from "../../clean.zod";
import { PaginationQuerySchema } from "@/packages/validation/schemas/pagination.query.schema";
import { UserInsertSchema } from "@/packages/validation/user/schemas/user.insert.schema";

/**
 * 获取用户列表时的查询参数验证 schema。
 * 1. 基于用户表的更新 schema 创建，因此所有字段默认为可选。
 * 2. 使用 `.pick()` 选择了可用于筛选的字段：'name', 'email', 'status', 'level'。
 * 3. 特别地，它重写了 'status' 和 'level' 字段，使其可以接受一个数组。
 *    这允许客户端通过提供多个状态或等级值来筛选用户，
 *    例如 `?status=normal&status=disabled`。
 */
export const UserListQuerySchema = PaginationQuerySchema.extend({
  status: UserInsertSchema.shape.status,
  level: UserInsertSchema.shape.level,
});

/**
 * 用户列表查询参数的 TypeScript 类型。
 * 从 `UserListQuerySchema` 推断而来。
 */
export type UserListQueryInput = CleanZod<typeof UserListQuerySchema>;
