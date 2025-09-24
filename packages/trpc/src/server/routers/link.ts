import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import { buildDrizzleWhere, buildDrizzleOrderBy } from "@honeycomb/trpc/server/libs/tools";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { LinkListQuerySchema } from "@honeycomb/validation/link/schemas/link.list.query.schema";
import { LinkCreateSchema } from "@honeycomb/validation/link/schemas/link.create.schema";
import { LinkUpdateSchema } from "@honeycomb/validation/link/schemas/link.update.schema";
import { UpdateSchema } from "@honeycomb/validation/schemas/update.schema";
import * as schema from "@honeycomb/db/src/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

export const linkRouter = router({
  index: publicProcedure
    .input(LinkListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, ...rest } = input as any;
      const searchText = rest.title || rest.description;
      const where = buildDrizzleWhere(
        schema.link,
        { ...rest, title: searchText },
        ["status"],
        { title: searchText },
      );

      // 构建排序条件
      const orderByClause = buildDrizzleOrderBy(
        schema.link,
        sortField,
        sortOrder as 'asc' | 'desc',
        'createdAt'
      );

      // 查询分页数据
      const list = await ctx.db
        .select()
        .from(schema.link)
        .where(where)
        .orderBy(orderByClause as any)
        .limit(limit)
        .offset((page - 1) * limit);

      // 查询总数
      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)`.as('count') })
        .from(schema.link)
        .where(where);
      const total = Number(countResult?.count) || 0;

      return { list, total };
    }),

  create: protectedProcedure(["ADMIN"])
    .input(LinkCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const now = new Date().toISOString();
      const [newLink] = await ctx.db
        .insert(schema.link)
        .values({
          ...input,
          createdAt: now,
          updatedAt: now,
        } as any)
        .returning();
      return newLink;
    }),

  destroy: protectedProcedure(["ADMIN"])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(schema.link)
        .where(inArray(schema.link.id, input.ids as string[]));
      return { success: true };
    }),

  update: protectedProcedure(["ADMIN"])
    .input(UpdateSchema(LinkUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input as { id: string; data: any };
      const [updatedLink] = await ctx.db
        .update(schema.link)
        .set({
          ...data,
          updatedAt: new Date().toISOString(),
        } as any)
        .where(eq(schema.link.id, id))
        .returning();
      return updatedLink;
    }),
});
