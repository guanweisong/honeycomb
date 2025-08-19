import { protectedProcedure, publicProcedure, router } from "@honeycomb/trpc/server/core";
import { MenuUpdateSchema } from "@honeycomb/validation/menu/schemas/menu.update.schema";
import { UserLevel, MenuType } from ".prisma/client";

export const menuRouter = router({
  index: publicProcedure.query(async ({ ctx }) => {
    const list = await ctx.prisma.menu.findMany({ orderBy: { power: "asc" } });
    const [categoryList, pageList] = await Promise.all([
      ctx.prisma.category.findMany(),
      ctx.prisma.page.findMany(),
    ]);

    list.forEach((m: any) => {
      if (m.type === MenuType.CATEGORY) {
        categoryList.forEach((n: any) => {
          if (m.id.toString() === n.id.toString()) {
            m.title = n.title;
            m.path = n.path;
            m.parent = n.parent;
          }
        });
      }
      if (m.type === MenuType.PAGE) {
        pageList.forEach((n: any) => {
          if (m.id.toString() === n.id.toString()) {
            m.title = n.title;
          }
        });
      }
    });

    const total = await ctx.prisma.menu.count();
    return { list, total };
  }),

  // 覆盖式更新：清空并重建
  saveAll: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(MenuUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.menu.deleteMany({});
      const result = await ctx.prisma.menu.createMany({ data: input as any });
      return result;
    }),
});
