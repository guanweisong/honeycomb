import "server-only";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
  mapApplicationError,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { MenuUpdateSchema } from "@/features/menu/schemas/menu.update.schema";
import {
  getMenuList,
  saveAllMenus,
} from "@/features/menu/application/menu-use-cases";
import { createMenuRepository } from "@/features/menu/infrastructure/menu-repository";
import { publicContentInvalidator } from "@/packages/infrastructure/refresh-path";

/** 菜单 API 的传输层，只负责输入、权限和业务服务编排。 */
export const menuRouter = createTRPCRouter({
  index: publicProcedure.query(({ ctx }) =>
    getMenuList(createMenuRepository(ctx.db), "PUBLIC_ONLY"),
  ),
  adminIndex: permissionProcedure(Permission.menuReadAll).query(({ ctx }) =>
    getMenuList(createMenuRepository(ctx.db), "ALL"),
  ),
  saveAll: permissionProcedure(Permission.menuUpdate)
    .input(MenuUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await saveAllMenus(
        createMenuRepository(ctx.db),
        input,
        publicContentInvalidator,
      ).catch(mapApplicationError);
      return result;
    }),
});
