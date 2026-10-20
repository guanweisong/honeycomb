import "server-only";
import { listMenus, saveAllMenus } from "@/features/menu/server";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
  mapApplicationError,
} from "@/lib/trpc/core";

import { Permission } from "@/lib/auth/permissions";

import { MenuWriteSchema as MenuUpdateSchema } from "@/features/menu/schema";

import { publicContentInvalidator } from "@/lib/cache/refresh-path";

/** 菜单 API 的传输层，只负责输入、权限和业务服务编排。 */
export const menuRouter = createTRPCRouter({
  index: publicProcedure.query(({ ctx }) => listMenus(ctx.db, "PUBLIC_ONLY")),
  adminIndex: permissionProcedure(Permission.menuReadAll).query(({ ctx }) =>
    listMenus(ctx.db, "ALL"),
  ),
  saveAll: permissionProcedure(Permission.menuUpdate)
    .input(MenuUpdateSchema)
    .mutation(({ input, ctx }) =>
      saveAllMenus(ctx.db, input, publicContentInvalidator).catch(
        mapApplicationError,
      ),
    ),
});
