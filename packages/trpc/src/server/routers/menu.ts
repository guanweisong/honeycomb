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
import * as schema from "@honeycomb/db/schema";
import { sql } from "drizzle-orm";
import { UserLevel } from "@honeycomb/types/user/user.level";
import { MultiLang } from "@honeycomb/types/multi.lang";

/**
 * 菜单相关的 tRPC 路由。
 */
export const menuRouter = router({
  /**
   * 查询完整的菜单列表，并附加关联项（分类、页面）的信息。
   * @returns {Promise<{ list: any[], total: number }>} 返回一个包含完整菜单列表和总数的对象。
   *
   * 工作流程：
   * 1. 查询 `menu` 表中的所有菜单项，按 `power` 字段升序排序。
   * 2. 并行查询 `category` 和 `page` 表中的所有数据。
   * 3. 遍历菜单项列表：
   *    - 如果菜单项类型是 `CATEGORY`，则从分类列表中找到对应的分类，并将其 `title`, `path`, `parent` 附加到菜单项上。
   *    - 如果菜单项类型是 `PAGE`，则从页面列表中找到对应的页面，并将其 `title` 附加到菜单项上。
   * 4. 查询并返回菜单项的总数。
   */
  index: publicProcedure.query(async ({ ctx }) => {
    const where = buildDrizzleWhere(schema.menu, {}, [], {});
    const orderByClause = buildDrizzleOrderBy(schema.menu, "power", "asc");

    const list = await ctx.db
      .select()
      .from(schema.menu)
      .where(where)
      .orderBy(orderByClause);

    const [categoryList, pageList] = await Promise.all([
      ctx.db.select().from(schema.category),
      ctx.db.select().from(schema.page),
    ]);

    const categoryMap = new Map(categoryList.map((c) => [c.id.toString(), c]));
    const pageMap = new Map(pageList.map((p) => [p.id.toString(), p]));

    const resultList = list.map((m) => {
      let title: MultiLang | undefined | null;
      let path: string | null | undefined = null;
      let parent: string | null | undefined = null;

      if (m.type === "CATEGORY") {
        const category = categoryMap.get(m.id.toString());
        title = category?.title;
        path = category?.path;
        parent = category?.parent;
      } else if (m.type === "PAGE") {
        const page = pageMap.get(m.id.toString());
        title = page?.title;
      }

      return {
        ...m,
        title,
        path,
        parent,
      };
    });

    const [countResult] = await ctx.db
      .select({ count: sql<number>`count(*)`.as("count") })
      .from(schema.menu)
      .where(where);
    const total = Number(countResult?.count) || 0;

    return { list: resultList, total };
  }),

  /**
   * 覆盖式保存整个菜单结构。
   * (需要管理员或编辑权限)
   * 此操作会先清空现有的所有菜单项，然后插入输入数据作为全新的菜单结构。
   * @param {MenuUpdateSchema} input - 一个包含所有菜单项的数组。
   * @returns {Promise<{ count: number }>} 返回新插入的菜单项数量。
   */
  saveAll: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
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
