import "server-only";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { MenuUpdateSchema } from "./schemas/menu.update.schema";
import { getMenuList } from "@/packages/application/navigation/menu-queries";
import { saveAllMenus } from "@/packages/application/navigation/menu-commands";

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
