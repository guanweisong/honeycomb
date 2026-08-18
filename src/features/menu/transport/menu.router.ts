import "server-only";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { MenuUpdateSchema } from "@/packages/trpc/api/modules/menu/schemas/menu.update.schema";
import { getMenuList } from "@/features/menu/application/menu-queries";
import { saveAllMenus } from "@/features/menu/application/menu-commands";

/** 菜单 API 的传输层，只负责输入、权限和业务服务编排。 */
export const menuRouter = createTRPCRouter({
  index: publicProcedure.query(({ ctx }) =>
    getMenuList(ctx.db, "PUBLIC_ONLY"),
  ),
  adminIndex: permissionProcedure(Permission.menuReadAll).query(({ ctx }) =>
    getMenuList(ctx.db, "ALL"),
  ),
  saveAll: permissionProcedure(Permission.menuUpdate)
    .input(MenuUpdateSchema)
    .mutation(({ input, ctx }) => saveAllMenus(ctx.db, input)),
});
