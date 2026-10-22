import "server-only";
import { getSetting } from "@/features/setting/server/setting-queries";
import { updateSetting } from "@/features/setting/server/setting-update";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
  mapApplicationError,
} from "@/lib/trpc/core";

import { Permission } from "@/lib/auth/permissions";

import { SettingAdminUpdateSchema as SettingUpdateSchema } from "@/features/setting/schemas/setting.admin-update.schema";

import { publicContentInvalidator } from "@/lib/cache/next-public-content-invalidator";

/** 网站设置 API 的传输层，只负责输入、权限和业务服务编排。 */
export const settingRouter = createTRPCRouter({
  index: publicProcedure.query(({ ctx }) => getSetting(ctx.db)),
  update: permissionProcedure(Permission.settingUpdate)
    .input(SettingUpdateSchema)
    .mutation(({ input, ctx }) =>
      updateSetting(ctx.db, input, ctx.user.id, publicContentInvalidator).catch(
        mapApplicationError,
      ),
    ),
});
