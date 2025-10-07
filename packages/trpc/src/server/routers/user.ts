import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import {
  buildDrizzleWhere,
  buildDrizzleOrderBy,
} from "@honeycomb/trpc/server/libs/tools";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { UserListQuerySchema } from "@honeycomb/validation/user/schemas/user.list.query.schema";
import { UserInsertSchema } from "@honeycomb/validation/user/schemas/user.insert.schema";
import { UserUpdateSchema } from "@honeycomb/validation/user/schemas/user.update.schema";
import * as schema from "@honeycomb/db/src/schema";
import { eq, inArray, sql, InferInsertModel } from "drizzle-orm";

export const userRouter = router({
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

  create: protectedProcedure(["ADMIN"])
    .input(UserInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const [newUser] = await ctx.db
        .insert(schema.user)
        .values(input as InferInsertModel<typeof schema.user>)
        .returning();
      return newUser;
    }),

  destroy: protectedProcedure(["ADMIN"])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(schema.user)
        .where(inArray(schema.user.id, input.ids));
      return { success: true };
    }),

  update: protectedProcedure(["ADMIN"])
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
