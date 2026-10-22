import "server-only";
import {
  listMenus,
  getMenuSnapshot,
} from "@/features/menu/server/menu-queries";
import { saveAllMenus } from "@/features/menu/server/menu-commands";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
  mapApplicationError,
} from "@/lib/trpc/core";

import { Permission } from "@/lib/auth/permissions";

import { MenuSaveSnapshotSchema as MenuUpdateSchema } from "@/features/menu/schemas/menu.save-snapshot.schema";

import { publicContentInvalidator } from "@/lib/cache/next-public-content-invalidator";

/** 菜单 API 的传输层，只负责输入、权限和业务服务编排。 */
export const menuRouter = createTRPCRouter({
  index: publicProcedure.query(({ ctx }) => listMenus(ctx.db, "PUBLIC_ONLY")),
  adminIndex: permissionProcedure(Permission.menuReadAll).query(({ ctx }) =>
    getMenuSnapshot(ctx.db),
  ),
  saveAll: permissionProcedure(Permission.menuUpdate)
    .input(MenuUpdateSchema)
    .mutation(({ input, ctx }) =>
      saveAllMenus(ctx.db, input, ctx.user.id, publicContentInvalidator).catch(
        mapApplicationError,
      ),
    ),
});
