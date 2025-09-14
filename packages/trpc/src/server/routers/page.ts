import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import { buildDrizzleWhere } from "@honeycomb/trpc/server/libs/tools";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { PageListQuerySchema } from "@honeycomb/validation/page/schemas/page.list.query.schema";
import { PageCreateSchema } from "@honeycomb/validation/page/schemas/page.create.schema";
import { PageUpdateSchema } from "@honeycomb/validation/page/schemas/page.update.schema";
import { UpdateSchema } from "@honeycomb/validation/schemas/update.schema";
import { z } from "zod";
import { IdSchema } from "@honeycomb/validation/schemas/fields/id.schema";
import * as schema from "@honeycomb/db/src/schema";
import { eq, inArray } from "drizzle-orm";

export const pageRouter = router({
  index: publicProcedure
    .input(PageListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, title, content, ...rest } =
        input as any;
      const where = buildDrizzleWhere(
        schema.page,
        { ...rest, title, content },
        ["status"],
        { title, content },
      );
      const list = await ctx.db.tables.page.select({
        whereExpr: where as any,
        orderBy: { field: sortField, direction: sortOrder },
        limit,
        offset: (page - 1) * limit,
      });

      // attach author minimal fields
      const authorIds = Array.from(
        new Set(list.map((p: any) => p.authorId).filter(Boolean)),
      );
      let authorMap: Record<string, any> = {};
      if (authorIds.length) {
        const authors = await ctx.db.tables.user.select({
          whereExpr: inArray(schema.user.id, authorIds as any),
        });
        authorMap = Object.fromEntries(authors.map((u: any) => [u.id, u]));
      }
      const listWithAuthor = list.map((p: any) => ({
        ...p,
        author: p.authorId ? (authorMap[p.authorId] ?? null) : null,
      }));

      const count = await ctx.db.tables.page.count(undefined, where as any);

      return { list: listWithAuthor, total: count };
    }),

  detail: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(async ({ input, ctx }) => {
      const result = await ctx.db.tables.page.select({
        id: input.id as string,
      });
      const item = result[0] as any;
      if (!item) return null;
      let author: any = null;
      if (item.authorId) {
        const a = await ctx.db.tables.user.select({
          id: item.authorId as string,
        });
        const au = a[0] as any;
        author = au ? { id: au.id, name: au.name } : null;
      }
      return { ...item, author } as any;
    }),

  create: protectedProcedure(["ADMIN", "EDITOR"])
    .input(PageCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const authorId = ctx.user?.id;
      await ctx.db.tables.page.insert({ ...(input as any), authorId } as any);
      return { ...(input as any), authorId } as any;
    }),

  destroy: protectedProcedure(["ADMIN", "EDITOR"])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.tables.page.deleteByIds(input.ids as string[]);
      return { success: true };
    }),

  update: protectedProcedure(["ADMIN", "EDITOR"])
    .input(UpdateSchema(PageUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input as any;
      await ctx.db.tables.page.update(data as any, { id });
      return { id, ...data };
    }),
});
