import { protectedProcedure, publicProcedure, router } from "@honeycomb/trpc/server/core";
import Tools from "@honeycomb/trpc/server/libs/tools";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { PostListQuerySchema } from "@honeycomb/validation/post/schemas/post.list.query.schema";
import { PostCreateSchema } from "@honeycomb/validation/post/schemas/post.create.schema";
import { PostUpdateSchema } from "@honeycomb/validation/post/schemas/post.update.schema";
import { UpdateSchema } from "@honeycomb/validation/schemas/update.schema";
import { UserLevel } from ".prisma/client";
import { z } from "zod";
import { IdSchema } from "@honeycomb/validation/schemas/fields/id.schema";

export const postRouter = router({
  index: publicProcedure
    .input(PostListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const {
        page,
        limit,
        sortField,
        sortOrder,
        title,
        content,
        categoryId,
        tagName,
        userName,
        ...rest
      } = input as any;

      const conditions: any = Tools.getFindConditionsByQueries(rest, ["status", "type"], { title, content });
      const OR: any[] = [];

      if (categoryId) {
        const categoryListAll = await ctx.prisma.category.findMany();
        const categoryList = Tools.sonsTree(categoryListAll, categoryId);
        OR.push({ categoryId });
        categoryList.forEach((item: any) => OR.push({ categoryId: item.id }));
      }

      if (tagName) {
        const tagCondition: any = { OR: [ { name: { is: { zh: tagName } } }, { name: { is: { en: tagName } } } ] };
        const tag = {
          list: await ctx.prisma.tag.findMany({ where: tagCondition }),
          total: await ctx.prisma.tag.count({ where: tagCondition }),
        };
        if (tag.total) {
          const id = { hasSome: [tag.list[0].id] } as any;
          OR.push({ galleryStyleIds: id }, { movieActorIds: id }, { movieStyleIds: id }, { movieDirectorIds: id });
        } else {
          return { list: [], total: 0 };
        }
      }

      if (userName) {
        const user = {
          list: await ctx.prisma.user.findMany({ where: { name: userName } }),
          total: await ctx.prisma.user.count({ where: { name: userName } }),
        };
        if (user.total) {
          conditions.authorId = user.list[0].id;
        } else {
          return { list: [], total: 0 };
        }
      }

      if (OR.length) conditions.OR = OR;

      const list = await ctx.prisma.post.findMany({
        where: conditions,
        orderBy: { [sortField]: sortOrder },
        take: limit,
        skip: (page - 1) * limit,
        include: {
          category: { select: { id: true, title: true } },
          author: { select: { id: true, name: true } },
          cover: { select: { id: true, url: true, width: true, height: true, color: true } },
        },
      });
      const total = await ctx.prisma.post.count({ where: conditions });
      const result = {
        list: list.map((item: any) => {
          const { content, ...rest } = item;
          return rest;
        }),
        total,
      };
      return result;
    }),

  detail: publicProcedure
    .input(z.object({ id: IdSchema }))
    .output(z.any())
    .query(async ({ input, ctx }) => {
      const result = await ctx.prisma.post.findUnique({
        where: { id: input.id },
        include: {
          category: { select: { id: true, title: true } },
          author: { select: { id: true, name: true } },
          cover: { select: { id: true, url: true, color: true } },
        },
      });
      return result;
    }),

  create: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(PostCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const authorId = ctx.user?.id;
      return await ctx.prisma.post.create({ data: { ...input, authorId } as any });
    }),

  destroy: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.post.deleteMany({ where: { id: { in: input.ids as string[] } } });
      return { success: true };
    }),

  update: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(UpdateSchema(PostUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;
      return await ctx.prisma.post.update({ where: { id }, data: data as any });
    }),
});
