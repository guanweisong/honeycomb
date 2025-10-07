import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import {
  buildDrizzleWhere,
  buildDrizzleOrderBy,
} from "@honeycomb/trpc/server/libs/tools";
import { MenuUpdateSchema } from "@honeycomb/validation/menu/schemas/menu.update.schema";
import * as schema from "@honeycomb/db/src/schema";
import { eq, inArray, sql, InferInsertModel } from "drizzle-orm";

export const menuRouter = router({
  index: publicProcedure.query(async ({ ctx }) => {
    const where = buildDrizzleWhere(schema.menu, {}, [], {});
    const orderByClause = buildDrizzleOrderBy(schema.menu, "power", "asc");

    const list = await ctx.db
      .select()
      .from(schema.menu)
      .where(where)
      .orderBy(orderByClause as any);

    const [categoryList, pageList] = await Promise.all([
      ctx.db.select().from(schema.category),
      ctx.db.select().from(schema.page),
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

    const [countResult] = await ctx.db
      .select({ count: sql<number>`count(*)`.as("count") })
      .from(schema.menu)
      .where(where);
    const total = Number(countResult?.count) || 0;

    return { list, total };
  }),

  // 覆盖式更新：清空并重建
  saveAll: protectedProcedure(["ADMIN", "EDITOR"])
    .input(MenuUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.delete(schema.menu);

      if (!input.length) {
        return { count: 0 };
      }

      const newMenu = await ctx.db
        .insert(schema.menu)
        .values(input.map(({ id, ...item }) => item))
        .returning();
      return { count: newMenu.length };
    }),
});
