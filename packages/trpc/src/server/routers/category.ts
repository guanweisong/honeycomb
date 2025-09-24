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
import { CategoryListQuerySchema } from "@honeycomb/validation/category/schemas/category.list.query.schema";
import { CategoryCreateSchema } from "@honeycomb/validation/category/schemas/category.create.schema";
import { CategoryUpdateSchema } from "@honeycomb/validation/category/schemas/category.update.schema";
import { UpdateSchema } from "@honeycomb/validation/schemas/update.schema";
import * as schema from "@honeycomb/db/src/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import Tools from "@honeycomb/trpc/server/libs/tools";

export const categoryRouter = router({
  index: publicProcedure
    .input(CategoryListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { id, page, limit, sortField, sortOrder, title, ...rest } =
        input as any;
      const where = buildDrizzleWhere(
        schema.category,
        { ...rest, title },
        ["status"],
        { title },
      );

      // 构建排序条件
      const orderByClause = buildDrizzleOrderBy(
        schema.category,
        sortField,
        sortOrder as "asc" | "desc",
        "createdAt",
      );

      // 查询分页数据
      const list = await ctx.db
        .select()
        .from(schema.category)
        .where(where)
        .orderBy(orderByClause as any)
        .limit(limit)
        .offset((page - 1) * limit);

      // 查询总数
      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.category)
        .where(where);
      const total = Number(countResult?.count) || 0;

      return {
        list: Tools.sonsTree(list, id),
        total,
      };
    }),

  create: protectedProcedure(["ADMIN", "EDITOR"])
    .input(CategoryCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const now = new Date().toISOString();
      const [newCategory] = await ctx.db
        .insert(schema.category)
        .values({
          ...input,
          createdAt: now,
          updatedAt: now,
        } as any)
        .returning();
      return newCategory;
    }),

  destroy: protectedProcedure(["ADMIN", "EDITOR"])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(schema.category)
        .where(inArray(schema.category.id, input.ids as string[]));
      return { success: true };
    }),

  update: protectedProcedure(["ADMIN", "EDITOR"])
    .input(UpdateSchema(CategoryUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input as { id: string; data: any };
      const [updatedCategory] = await ctx.db
        .update(schema.category)
        .set({
          ...data,
          updatedAt: new Date().toISOString(),
        } as any)
        .where(eq(schema.category.id, id))
        .returning();
      return updatedCategory;
    }),
});
