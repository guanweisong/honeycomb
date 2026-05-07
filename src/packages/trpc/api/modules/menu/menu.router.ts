import {
  protectedProcedure,
  publicProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { MenuUpdateSchema } from "@/packages/trpc/api/modules/menu/schemas/menu.update.schema";
import * as schema from "@/packages/db/schema";
import { asc, inArray } from "drizzle-orm";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { MultiLang } from "@/packages/trpc/api/types/multi.lang";
import { revalidateTag } from "next/cache";
import { blogCacheTags } from "@/packages/trpc/api/utils/blog-cache-tags";
import { MenuType } from "@/packages/trpc/api/modules/menu/types/menu.type";

/**
 * 菜单相关的 tRPC 路由。
 */
export const menuRouter = createTRPCRouter({
  /**
   * 查询完整的菜单列表，并附加关联项（分类、页面）的信息。
   * @returns {Promise<{ list: object[], total: number }>} 返回一个包含完整菜单列表和总数的对象。
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
    const menus = await ctx.db.query.menu.findMany({
      orderBy: [asc(schema.menu.power)],
    });

    const categoryIds = menus
      .filter((m) => m.type === MenuType.CATEGORY && Boolean(m.categoryId))
      .map((m) => m.categoryId as string);
    const pageIds = menus
      .filter((m) => m.type === MenuType.PAGE && Boolean(m.pageId))
      .map((m) => m.pageId as string);

    const [categories, pages] = await Promise.all([
      categoryIds.length
        ? ctx.db
            .select({
              id: schema.category.id,
              title: schema.category.title,
              path: schema.category.path,
            })
            .from(schema.category)
            .where(inArray(schema.category.id, categoryIds))
        : Promise.resolve([]),
      pageIds.length
        ? ctx.db
            .select({
              id: schema.page.id,
              title: schema.page.title,
            })
            .from(schema.page)
            .where(inArray(schema.page.id, pageIds))
        : Promise.resolve([]),
    ]);

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const pageMap = new Map(pages.map((p) => [p.id, p]));

    const businessIdByRowId = new Map(
      menus.map((m) => [
        m.id,
        m.type === MenuType.CATEGORY
          ? m.categoryId
          : m.type === MenuType.PAGE
            ? m.pageId
            : m.customId,
      ]),
    );

    const resultList = menus.map((m) => {
      let title: MultiLang | undefined | null;
      let path: string | null | undefined = null;
      let id: string | null | undefined = m.id;

      if (m.type === MenuType.CATEGORY) {
        const category = m.categoryId ? categoryMap.get(m.categoryId) : null;
        id = m.categoryId ?? m.id;
        title = category?.title;
        path = category?.path;
      } else if (m.type === MenuType.PAGE) {
        const page = m.pageId ? pageMap.get(m.pageId) : null;
        id = m.pageId ?? m.id;
        title = page?.title;
      } else if (m.type === MenuType.CUSTOM) {
        id = m.customId ?? m.id;
      }

      return {
        id,
        parent: m.parent ? (businessIdByRowId.get(m.parent) ?? null) : null,
        power: m.power,
        type: m.type,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        title,
        path,
      };
    });

    const total = resultList.length;

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

      const rowIdByBusinessId = new Map(input.map((item) => [item.id, crypto.randomUUID()]));

      const newMenu = await ctx.db
        .insert(schema.menu)
        .values(
          input.map(({ id, type, parent, power }) => ({
            id: rowIdByBusinessId.get(id)!,
            parent: parent ? rowIdByBusinessId.get(parent) ?? null : null,
            power,
            type,
            categoryId: type === MenuType.CATEGORY ? id : null,
            pageId: type === MenuType.PAGE ? id : null,
            customId: type === MenuType.CUSTOM ? id : null,
          })),
        )
        .returning();
      revalidateTag(blogCacheTags.menu(), "max");
      revalidateTag(blogCacheTags.postList(), "max");
      return { count: newMenu.length };
    }),
});
