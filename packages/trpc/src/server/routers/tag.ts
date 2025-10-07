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
import { TagListQuerySchema } from "@honeycomb/validation/tag/schemas/tag.list.query.schema";
import { TagInsertSchema } from "@honeycomb/validation/tag/schemas/tag.insert.schema";
import { TagUpdateSchema } from "@honeycomb/validation/tag/schemas/tag.update.schema";
import * as schema from "@honeycomb/db/src/schema";
import { eq, inArray, sql, InferInsertModel } from "drizzle-orm";

export const tagRouter = router({
  index: publicProcedure
    .input(TagListQuerySchema)
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, name, ...rest } = input;
      const where = buildDrizzleWhere(
        schema.tag,
        { ...rest, name },
        ["status"],
        { name },
      );
      // 构建排序条件
      const orderByClause = buildDrizzleOrderBy(
        schema.tag,
        sortField,
        sortOrder as "asc" | "desc",
        "createdAt",
      );

      // 查询分页数据
      const list = await ctx.db
        .select()
        .from(schema.tag)
        .where(where)
        .orderBy(orderByClause as any)
        .limit(limit)
        .offset((page - 1) * limit);

      // 查询总数
      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.tag)
        .where(where);
      const total = Number(countResult?.count) || 0;

      return { list, total };
    }),

  create: protectedProcedure(["ADMIN", "EDITOR"])
    .input(TagInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const [newTag] = await ctx.db
        .insert(schema.tag)
        .values(input as InferInsertModel<typeof schema.tag>)
        .returning();
      return newTag;
    }),

  destroy: protectedProcedure(["ADMIN"])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.delete(schema.tag).where(inArray(schema.tag.id, input.ids));
      return { success: true };
    }),

  update: protectedProcedure(["ADMIN", "EDITOR"])
    .input(TagUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const [updatedTag] = await ctx.db
        .update(schema.tag)
        .set(rest as Partial<InferInsertModel<typeof schema.tag>>)
        .where(eq(schema.tag.id, id))
        .returning();
      return updatedTag;
    }),
});
