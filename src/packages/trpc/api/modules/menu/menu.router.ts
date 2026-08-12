import "server-only";

import {
  permissionProcedure,
  publicProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { MenuUpdateSchema } from "@/packages/trpc/api/modules/menu/schemas/menu.update.schema";
import * as schema from "@/packages/infrastructure/db/schema";
import { MenuType } from "@/packages/domain/navigation/menu";
import { getMenuList } from "@/packages/trpc/api/modules/menu/menu.service";
import { ResourceVisibility } from "@/packages/trpc/api/types/resource-visibility";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

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
  index: publicProcedure.query(({ ctx }) =>
    getMenuList(ctx.db, ResourceVisibility.PUBLIC_ONLY),
  ),

  adminIndex: permissionProcedure(Permission.menuReadAll).query(({ ctx }) =>
    getMenuList(ctx.db, ResourceVisibility.ALL),
  ),

  /**
   * 覆盖式保存整个菜单结构。
   * (需要管理员或编辑权限)
   * 此操作会先清空现有的所有菜单项，然后插入输入数据作为全新的菜单结构。
   * @param {MenuUpdateSchema} input - 一个包含所有菜单项的数组。
   * @returns {Promise<{ count: number }>} 返回新插入的菜单项数量。
   */
  saveAll: permissionProcedure(Permission.menuUpdate)
    .input(MenuUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      return observeDbOperation("menu.save-all", "transaction", () =>
        ctx.db.transaction(async (tx) => {
          await tx.delete(schema.menu);

          if (!input.length) {
            return { count: 0 };
          }

          const rowIdByBusinessId = new Map(
            input.map((item) => [item.id, crypto.randomUUID()]),
          );

          const newMenu = await tx
            .insert(schema.menu)
            .values(
              input.map(({ id, type, parent, power }) => ({
                id: rowIdByBusinessId.get(id)!,
                parent: parent ? (rowIdByBusinessId.get(parent) ?? null) : null,
                power,
                type,
                categoryId: type === MenuType.CATEGORY ? id : null,
                pageId: type === MenuType.PAGE ? id : null,
                customId: type === MenuType.CUSTOM ? id : null,
              })),
            )
            .returning();
          return { count: newMenu.length };
        }),
      );
    }),
});
