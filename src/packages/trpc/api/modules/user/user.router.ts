import {
  protectedProcedure,
  publicProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { TRPCError } from "@trpc/server";
import {
  buildDrizzleWhere,
  buildDrizzleOrderBy,
} from "@/packages/trpc/api/utils/tools";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { UserListQuerySchema } from "@/packages/trpc/api/modules/user/schemas/user.list.query.schema";
import { UserInsertSchema } from "@/packages/trpc/api/modules/user/schemas/user.insert.schema";
import { UserUpdateSchema } from "@/packages/trpc/api/modules/user/schemas/user.update.schema";
import * as schema from "@/packages/db/schema";
import { eq, inArray, sql, InferInsertModel } from "drizzle-orm";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { hash } from "bcryptjs";
import { z } from "zod";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";

const BCRYPT_ROUNDS = 12;

/**
 * 用户相关的 tRPC 路由。
 */
export const userRouter = createTRPCRouter({
  detail: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .select({
          id: schema.user.id,
          name: schema.user.name,
        })
        .from(schema.user)
        .where(eq(schema.user.id, input.id))
        .limit(1);

      return user ?? null;
    }),

  /**
   * 获取当前登录用户的安全信息。
   * 该接口依赖 tRPC context 中已完成的 session 解析和数据库状态复核，
   * 仅在当前用户仍处于可用状态时返回信息。
   *
   * @returns {Promise<{ id: string; email: string | null; level: UserLevel; name: string | null; status: schema.user.$inferSelect["status"] }>} 当前登录用户信息。
   */
  current: protectedProcedure([
    UserLevel.ADMIN,
    UserLevel.EDITOR,
    UserLevel.GUEST,
  ]).query(async ({ ctx }) => {
    const [user] = await ctx.db
      .select({
        id: schema.user.id,
        email: schema.user.email,
        level: schema.user.level,
        name: schema.user.name,
        status: schema.user.status,
      })
      .from(schema.user)
      .where(eq(schema.user.id, ctx.user.id))
      .limit(1);

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return user;
  }),

  /**
   * 查询用户列表（支持分页、筛选、排序）。
   * 仅返回后台展示所需字段，不暴露密码哈希。
   *
   * @param {UserListQuerySchema} input - 查询参数。
   * @returns {Promise<{ list: object[], total: number }>} 返回一个包含用户列表和总记录数的对象。
   */
  index: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR, UserLevel.GUEST])
    .input(UserListQuerySchema)
    .query(async ({ input, ctx }) => {
      const { page = 1, limit = 10, sortField, sortOrder, ...rest } = input;
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
        .select({
          id: schema.user.id,
          email: schema.user.email,
          level: schema.user.level,
          name: schema.user.name,
          status: schema.user.status,
          createdAt: schema.user.createdAt,
          updatedAt: schema.user.updatedAt,
        })
        .from(schema.user)
        .where(where)
        .orderBy(orderByClause)
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
   * 在写入数据库前，会使用 bcrypt 对明文密码进行哈希处理。
   *
   * @param {UserInsertSchema} input - 新用户的数据。
   * @returns {Promise<User>} 返回新创建的用户对象。
   */
  create: protectedProcedure([UserLevel.ADMIN])
    .input(UserInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const values = {
        ...input,
        password: await hash(input.password, BCRYPT_ROUNDS),
      };
      const [newUser] = await ctx.db
        .insert(schema.user)
        .values(values as InferInsertModel<typeof schema.user>)
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
   * 当请求体中包含新密码时，会先使用 bcrypt 重新哈希，再写入数据库。
   *
   * @param {UserUpdateSchema} input - 包含要更新的用户 ID 和新数据。
   * @returns {Promise<User>} 返回更新后的用户对象。
   */
  update: protectedProcedure([UserLevel.ADMIN])
    .input(UserUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const values = {
        ...rest,
        ...(rest.password
          ? { password: await hash(rest.password, BCRYPT_ROUNDS) }
          : {}),
      };
      const [updatedUser] = await ctx.db
        .update(schema.user)
        .set(values as Partial<InferInsertModel<typeof schema.user>>)
        .where(eq(schema.user.id, id))
        .returning();
      return updatedUser;
    }),
});
