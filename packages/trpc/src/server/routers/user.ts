import {
  protectedProcedure,
  publicProcedure,
  createTRPCRouter,
} from "@honeycomb/trpc/server/core";
import {
  buildDrizzleWhere,
  buildDrizzleOrderBy,
} from "@honeycomb/trpc/server/libs/tools";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { UserListQuerySchema } from "@honeycomb/validation/user/schemas/user.list.query.schema";
import { UserInsertSchema } from "@honeycomb/validation/user/schemas/user.insert.schema";
import { UserUpdateSchema } from "@honeycomb/validation/user/schemas/user.update.schema";
import * as schema from "@honeycomb/db/schema";
import { eq, inArray, sql, InferInsertModel } from "drizzle-orm";
import { UserLevel } from "@honeycomb/types/user/user.level";

/**
 * 用户相关的 tRPC 路由。
 */
export const userRouter = createTRPCRouter({
  /**
   * 查询用户列表（支持分页、筛选、排序）。
   * @param {UserListQuerySchema} input - 查询参数。
   * @returns {Promise<{ list: any[], total: number }>} 返回一个包含用户列表和总记录数的对象。
   */
  index: publicProcedure
    .input(UserListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, ...rest } = input as any;
      const where = buildDrizzleWhere(schema.user, rest, ["status", "level"]);

      // 构建排序条件
      const orderByClause = buildDrizzleOrderBy(
        schema.user,
        sortField,
        sortOrder as "asc" | "desc",
        "createdAt",
      );

      // 查询分页数据
      const list = await ctx.db
        .select()
        .from(schema.user)
        .where(where)
        .orderBy(orderByClause as any)
        .limit(limit)
        .offset((page - 1) * limit);

      // 查询总数
      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.user)
        .where(where);
      const total = Number(countResult?.count) || 0;

      return { list, total };
    }),

  /**
   * 创建一个新用户。
   * (需要管理员权限)
   * @param {UserInsertSchema} input - 新用户的数据。
   * @returns {Promise<User>} 返回新创建的用户对象。
   */
  create: protectedProcedure([UserLevel.ADMIN])
    .input(UserInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const [newUser] = await ctx.db
        .insert(schema.user)
        .values(input as InferInsertModel<typeof schema.user>)
        .returning();
      return newUser;
    }),

  /**
   * 批量删除用户。
   * (需要管理员权限)
   * @param {DeleteBatchSchema} input - 包含要删除的用户 ID 数组。
   * @returns {Promise<{ success: boolean }>} 返回表示操作成功的对象。
   */
  destroy: protectedProcedure([UserLevel.ADMIN])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(schema.user)
        .where(inArray(schema.user.id, input.ids));
      return { success: true };
    }),

  /**
   * 更新一个用户。
   * (需要管理员权限)
   * @param {UserUpdateSchema} input - 包含要更新的用户 ID 和新数据。
   * @returns {Promise<User>} 返回更新后的用户对象。
   */
  update: protectedProcedure([UserLevel.ADMIN])
    .input(UserUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const [updatedUser] = await ctx.db
        .update(schema.user)
        .set(rest as Partial<InferInsertModel<typeof schema.user>>)
        .where(eq(schema.user.id, id))
        .returning();
      return updatedUser;
    }),
});
