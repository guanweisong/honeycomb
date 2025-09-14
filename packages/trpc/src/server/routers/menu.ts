import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import { MenuUpdateSchema } from "@honeycomb/validation/menu/schemas/menu.update.schema";

export const menuRouter = router({
  index: publicProcedure.query(async ({ ctx }) => {
    const list = await ctx.db.tables.menu.select({
      orderBy: { field: "power", direction: "asc" },
    });
    const [categoryList, pageList] = await Promise.all([
      ctx.db.tables.category.select({}),
      ctx.db.tables.page.select({}),
    ]);

    list.forEach((m: any) => {
      if (m.type === "CATEGORY") {
        categoryList.forEach((n: any) => {
          if (m.id.toString() === n.id.toString()) {
            (m as any).title = n.title;
            (m as any).path = n.path;
            (m as any).parent = n.parent;
          }
        });
      }
      if (m.type === "PAGE") {
        pageList.forEach((n: any) => {
          if (m.id.toString() === n.id.toString()) {
            (m as any).title = n.title;
          }
        });
      }
    });

    const count = await ctx.db.tables.menu.count({});
    return { list, total: count };
  }),

  // 覆盖式更新：清空并重建
  saveAll: protectedProcedure(["ADMIN", "EDITOR"])
    .input(MenuUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.tables.menu.deleteAll();
      await ctx.db.tables.menu.bulkInsert(input as any);
      return { count: (input as any[]).length } as any;
    }),
});
