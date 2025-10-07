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
import { CategoryInsertSchema } from "@honeycomb/validation/category/schemas/category.insert.schema";
import { CategoryUpdateSchema } from "@honeycomb/validation/category/schemas/category.update.schema";
import * as schema from "@honeycomb/db/src/schema";
import { eq, inArray, sql, InferInsertModel } from "drizzle-orm";
import Tools from "@honeycomb/trpc/server/libs/tools";

export const categoryRouter = router({
  index: publicProcedure
    .input(CategoryListQuerySchema)
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
    .input(CategoryInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const [newCategory] = await ctx.db
        .insert(schema.category)
        .values(input as InferInsertModel<typeof schema.category>)
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
    .input(CategoryUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const [updatedCategory] = await ctx.db
        .update(schema.category)
        .set(rest as Partial<InferInsertModel<typeof schema.category>>)
        .where(eq(schema.category.id, id))
        .returning();
      return updatedCategory;
    }),
});
